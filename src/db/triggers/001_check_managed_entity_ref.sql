-- 001_check_managed_entity_ref.sql
--
-- soft-fk: ref_id must exist in organization or venue

CREATE OR REPLACE FUNCTION check_managed_entity_ref()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.managed_entity_type = 'organization' THEN
        IF NOT EXISTS (
            SELECT 1 FROM organization
            WHERE id = NEW.ref_id
            AND deleted_at IS NULL
        ) THEN
            RAISE EXCEPTION
                'managed_entity: ref_id % does not exist in organization',
                NEW.ref_id;
        END IF;

    ELSIF NEW.managed_entity_type = 'venue' THEN
        IF NOT EXISTS (
            SELECT 1 FROM venue
            WHERE id = NEW.ref_id
            AND deleted_at IS NULL
        ) THEN
            RAISE EXCEPTION
                'managed_entity: ref_id % does not exist in venue',
                NEW.ref_id;
        END IF;

    ELSIF NEW.managed_entity_type = 'facility' THEN
        IF NOT EXISTS (
            SELECT 1 FROM facility
            WHERE id = NEW.ref_id
            AND deleted_at IS NULL
        ) THEN
            RAISE EXCEPTION
                'managed_entity: ref_id % does not exist in facility',
                NEW.ref_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

---split---
DROP TRIGGER IF EXISTS trg_check_managed_entity_ref ON managed_entity;

---split---
CREATE TRIGGER trg_check_managed_entity_ref
BEFORE INSERT OR UPDATE OF ref_id, managed_entity_type
ON managed_entity
FOR EACH ROW EXECUTE FUNCTION check_managed_entity_ref();
