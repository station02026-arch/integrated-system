-- Allow everyone to view reports (for management)
drop policy if exists "Users can manage their own reports" on public.daily_reports;
drop policy if exists "Users can manage their own report entries" on public.daily_report_entries;

-- Daily Reports: Insert own, Select all, Update own, Delete own
create policy "Users can insert own reports"
  on public.daily_reports for insert
  with check (auth.uid() = user_id);

create policy "Users can view all reports"
  on public.daily_reports for select
  using (true);

create policy "Users can update own reports"
  on public.daily_reports for update
  using (auth.uid() = user_id);

create policy "Users can delete own reports"
  on public.daily_reports for delete
  using (auth.uid() = user_id);

-- Entries: Same logic
create policy "Users can insert own entries"
  on public.daily_report_entries for insert
  with check (
    exists (
      select 1 from public.daily_reports
      where daily_reports.id = daily_report_entries.report_id
      and daily_reports.user_id = auth.uid()
    )
  );

create policy "Users can view all entries"
  on public.daily_report_entries for select
  using (true);

create policy "Users can update own entries"
  on public.daily_report_entries for update
  using (
    exists (
      select 1 from public.daily_reports
      where daily_reports.id = daily_report_entries.report_id
      and daily_reports.user_id = auth.uid()
    )
  );

create policy "Users can delete own entries"
  on public.daily_report_entries for delete
  using (
    exists (
      select 1 from public.daily_reports
      where daily_reports.id = daily_report_entries.report_id
      and daily_reports.user_id = auth.uid()
    )
  );
