-- prisma/migrations/00000000000000_uuid_v7_function/migration.sql
CREATE OR REPLACE FUNCTION uuid_generate_v7()
RETURNS uuid
AS $$
  SELECT encode(
    set_bit(
      set_bit(
        overlay(uuid_send(gen_random_uuid()) placing
          substring(int8send(floor(extract(epoch from clock_timestamp()) * 1000)::bigint) from 3)
          from 1 for 6
        ),
        52, 1
      ),
      53, 1
    ),
    'hex'
  )::uuid;
$$ LANGUAGE sql VOLATILE;
