-- Add metadata column and ensure content is treated as JSONB if possible, 
-- but since it might be text currently, we'll just add a check constraint or comment.
-- Actually, Supabase 'text' columns can store JSON strings. 
-- Let's add a 'metadata' column for scale, location, etc.

ALTER TABLE drawings 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- We will store the Pipe Linker data (Nodes/Edges) in the 'content' column as a JSON string.
-- No schema change needed for 'content' if it's already text, but good to know.

-- Create a function to update the updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_drawings_updated_at
    BEFORE UPDATE ON drawings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
