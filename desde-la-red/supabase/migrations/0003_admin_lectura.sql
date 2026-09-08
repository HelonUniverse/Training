-- ============================================================================
-- El panel de administración necesita ver dos cosas que las políticas
-- originales dejaban fuera: las reservas de todo el mundo y el número de
-- personas en la Red.
--
-- Solo lectura, y solo para quien tenga role = 'admin'. Nadie más gana nada:
-- una persona sigue viendo únicamente sus propias reservas.
-- ============================================================================

drop policy if exists "las admins ven las reservas" on public.bookings;
create policy "las admins ven las reservas" on public.bookings
  for select using (public.is_admin());

-- `perfil propio visible` ya deja que las admins lean los perfiles; esto solo
-- lo deja escrito para que se vea al leer las políticas de la tabla.
comment on table public.profiles is
  'Cada persona ve y edita el suyo. Las administradoras los ven todos, para
   saber quién está en la Red y a nombre de quién viene una reserva.';
