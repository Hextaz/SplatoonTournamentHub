-- Add a description column to the tournaments table
ALTER TABLE public.tournaments
ADD COLUMN description text;
