CREATE TYPE public.app_role AS ENUM ('admin', 'supervisor');

-- PROFILES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- USER ROLES (separate table to prevent privilege escalation)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY user_roles_select ON public.user_roles FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY profiles_select ON public.profiles FOR SELECT TO authenticated
USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY profiles_update_own ON public.profiles FOR UPDATE TO authenticated
USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- New users always become supervisors; admin only granted by trusted process
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NULLIF(NEW.raw_user_meta_data ->> 'full_name', ''), 'User'), NEW.email)
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'supervisor')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- NURSES
CREATE TABLE public.nurses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nurse_code TEXT UNIQUE NOT NULL CHECK (length(nurse_code) BETWEEN 1 AND 50),
  full_name TEXT NOT NULL CHECK (length(full_name) BETWEEN 1 AND 120),
  ward TEXT,
  supervisor_id UUID REFERENCES public.profiles(id),
  device_code TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX nurses_supervisor_idx ON public.nurses(supervisor_id);
GRANT SELECT, INSERT, UPDATE ON public.nurses TO authenticated;
GRANT ALL ON public.nurses TO service_role;
ALTER TABLE public.nurses ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.can_access_nurse(target_nurse_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.nurses n
    WHERE n.id = target_nurse_id
      AND (public.has_role(auth.uid(), 'admin') OR n.supervisor_id = auth.uid())
  )
$$;

CREATE POLICY nurses_select ON public.nurses FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR supervisor_id = auth.uid());
CREATE POLICY nurses_admin_insert ON public.nurses FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY nurses_admin_update ON public.nurses FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Supervisor assigned to a nurse must have the supervisor role
CREATE OR REPLACE FUNCTION public.validate_nurse_supervisor()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.supervisor_id IS NOT NULL AND NOT public.has_role(NEW.supervisor_id, 'supervisor') THEN
    RAISE EXCEPTION 'Assigned user is not a supervisor';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER nurses_validate_supervisor BEFORE INSERT OR UPDATE ON public.nurses
FOR EACH ROW EXECUTE FUNCTION public.validate_nurse_supervisor();

-- SENSOR READINGS (writes only via trusted backend / service role)
CREATE TABLE public.sensor_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nurse_id UUID NOT NULL REFERENCES public.nurses(id),
  heart_rate NUMERIC CHECK (heart_rate IS NULL OR heart_rate > 0),
  temperature NUMERIC,
  accel_x NUMERIC, accel_y NUMERIC, accel_z NUMERIC,
  source TEXT NOT NULL DEFAULT 'device' CHECK (source IN ('device','simulator','manual')),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  received_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX sensor_readings_nurse_time_idx ON public.sensor_readings(nurse_id, recorded_at DESC);
GRANT SELECT ON public.sensor_readings TO authenticated;
GRANT ALL ON public.sensor_readings TO service_role;
ALTER TABLE public.sensor_readings ENABLE ROW LEVEL SECURITY;
CREATE POLICY sensor_select ON public.sensor_readings FOR SELECT TO authenticated
USING (public.can_access_nurse(nurse_id));

-- PREDICTIONS (writes only via trusted backend / service role)
CREATE TABLE public.predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nurse_id UUID NOT NULL REFERENCES public.nurses(id),
  stress_level TEXT NOT NULL CHECK (stress_level IN ('normal','moderate','high','unknown')),
  confidence NUMERIC CHECK (confidence IS NULL OR confidence BETWEEN 0 AND 1),
  model_version TEXT,
  api_status TEXT NOT NULL DEFAULT 'success' CHECK (api_status IN ('success','failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX predictions_nurse_time_idx ON public.predictions(nurse_id, created_at DESC);
GRANT SELECT ON public.predictions TO authenticated;
GRANT ALL ON public.predictions TO service_role;
ALTER TABLE public.predictions ENABLE ROW LEVEL SECURITY;
CREATE POLICY predictions_select ON public.predictions FOR SELECT TO authenticated
USING (public.can_access_nurse(nurse_id));

-- MANUAL ACTIONS
CREATE TABLE public.manual_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nurse_id UUID NOT NULL REFERENCES public.nurses(id),
  prediction_id UUID REFERENCES public.predictions(id),
  action_type TEXT NOT NULL CHECK (action_type IN ('checked','recommend_rest','follow_up','other')),
  note TEXT CHECK (note IS NULL OR length(note) <= 1000),
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX manual_actions_nurse_time_idx ON public.manual_actions(nurse_id, created_at DESC);
GRANT SELECT, INSERT ON public.manual_actions TO authenticated;
GRANT ALL ON public.manual_actions TO service_role;
ALTER TABLE public.manual_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY actions_select ON public.manual_actions FOR SELECT TO authenticated
USING (public.can_access_nurse(nurse_id));
CREATE POLICY actions_insert ON public.manual_actions FOR INSERT TO authenticated
WITH CHECK (created_by = auth.uid() AND public.can_access_nurse(nurse_id));

CREATE OR REPLACE FUNCTION public.validate_manual_action()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.prediction_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.predictions p WHERE p.id = NEW.prediction_id AND p.nurse_id = NEW.nurse_id
  ) THEN
    RAISE EXCEPTION 'Prediction does not belong to this nurse';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.nurses n WHERE n.id = NEW.nurse_id AND n.is_active) THEN
    RAISE EXCEPTION 'Nurse is inactive';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER manual_actions_validate BEFORE INSERT ON public.manual_actions
FOR EACH ROW EXECUTE FUNCTION public.validate_manual_action();

-- Directory of supervisors for admins (names + ids only) and names of action authors
CREATE OR REPLACE FUNCTION public.list_supervisors()
RETURNS TABLE (id UUID, full_name TEXT, email TEXT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.full_name, p.email FROM public.profiles p
  JOIN public.user_roles r ON r.user_id = p.id AND r.role = 'supervisor'
  WHERE public.has_role(auth.uid(), 'admin')
  ORDER BY p.full_name
$$;

CREATE OR REPLACE FUNCTION public.profile_names(ids UUID[])
RETURNS TABLE (id UUID, full_name TEXT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.full_name FROM public.profiles p
  WHERE p.id = ANY(ids) AND auth.uid() IS NOT NULL
$$;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_nurse_supervisor() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_manual_action() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.list_supervisors() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.profile_names(UUID[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_supervisors() TO authenticated;
GRANT EXECUTE ON FUNCTION public.profile_names(UUID[]) TO authenticated;