-- Create storage bucket for RFP documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('rfp-documents', 'rfp-documents', false);

-- Create RLS policies for RFP documents bucket
CREATE POLICY "Anyone can upload RFP documents"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'rfp-documents');

CREATE POLICY "Anyone can view RFP documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'rfp-documents');

CREATE POLICY "Anyone can update RFP documents"
ON storage.objects FOR UPDATE
USING (bucket_id = 'rfp-documents');