-- 007_check_event_parent_type.sql
--
-- parent event's type must be an allowed parent for this event's type

CREATE OR REPLACE FUNCTION check_event_parent_type()
RETURNS TRIGGER AS $$
DECLARE
    parent_event_type_id SMALLINT;
BEGIN
    IF NEW.parent_event_id IS NULL THEN
        RETURN NEW;
    END IF;

    IF NEW.parent_event_id = NEW.id THEN
        RAISE EXCEPTION
            'event: event % cannot be its own parent',
            NEW.id;
    END IF;

    SELECT type_id INTO parent_event_type_id
    FROM event
    WHERE id=NEW.parent_event_id
    AND deleted_at IS NULL;

    IF parent_event_type_id IS NULL THEN
        RAISE EXCEPTION
            'event: parent event % does not exist or is deleted',
            NEW.parent_event_id;
    END IF;

    IF NOT EXISTS(
        SELECT 1
        FROM event_type_allowed_parent
        WHERE child_type_id=NEW.type_id
        AND parent_type_id=parent_event_type_id
    ) THEN
        RAISE EXCEPTION
            'event: type % is not allowed to be placed under type %',
            NEW.type_id,
            parent_event_type_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

---split---
DROP TRIGGER IF EXISTS trg_check_event_parent_type ON event;

---split---
CREATE TRIGGER trg_check_event_parent_type
BEFORE INSERT OR UPDATE OF type_id, parent_event_id
ON event
FOR EACH ROW EXECUTE FUNCTION check_event_parent_type();
