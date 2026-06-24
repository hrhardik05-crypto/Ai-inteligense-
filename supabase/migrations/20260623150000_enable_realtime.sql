-- Enable Realtime for the candidates table to broadcast insert/update/delete events
alter publication supabase_realtime add table candidates;
