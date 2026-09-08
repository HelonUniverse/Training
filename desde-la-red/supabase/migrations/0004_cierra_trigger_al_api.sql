-- ============================================================================
-- El linter de seguridad de Supabase avisa de dos funciones `security definer`
-- alcanzables desde la API pública. Una se cierra; la otra tiene que quedarse.
-- ============================================================================

-- `handle_new_user` es una función de disparador: la ejecuta Postgres cuando
-- alguien se registra, nunca una persona. Al vivir en el esquema public quedaba
-- expuesta en /rest/v1/rpc/handle_new_user. Se le quita el permiso de ejecución
-- a quien entra por la API; el disparador sigue funcionando igual, porque corre
-- con los privilegios de su dueño.
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- `is_admin` sí se queda ejecutable, y es a propósito: las políticas de RLS la
-- evalúan con los permisos de quien consulta, así que quitarle el permiso
-- rompería la escritura de las administradoras. No filtra nada — responde
-- únicamente si quien pregunta es administradora, mirando su propio auth.uid().
comment on function public.is_admin() is
  'Responde si quien consulta es administradora. Ejecutable por anon y
   authenticated a propósito: las políticas de RLS la evalúan como el rol que
   consulta. No revela nada de terceros.';
