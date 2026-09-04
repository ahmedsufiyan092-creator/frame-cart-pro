CREATE POLICY "Staff can view coupons" ON public.coupons FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff can view coupon redemptions" ON public.coupon_redemptions FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff can view payment events" ON public.payment_events FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff can view inventory movements" ON public.inventory_movements FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff can view audit logs" ON public.audit_logs FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));