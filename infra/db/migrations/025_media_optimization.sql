-- Automatic image optimization (product brief §16): uploads are now
-- normalized (orientation), resized to a sane max dimension, and
-- re-encoded as WebP before being written to disk — mime_type/size_bytes
-- above already describe the STORED (optimized) file; these two columns
-- add the original's provenance for diagnostics without duplicating the
-- rest of the row shape.
alter table media_assets
  add column original_mime_type text,
  add column original_size_bytes integer;
