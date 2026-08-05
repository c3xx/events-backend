-- 015_cascade_soft_delete_managed_entity.sql
--
-- Soft-delete cascading from organization and venue to managed_entity

-- organization
CREATE OR REPLACE FUNCTION cascade_organization_soft_delete()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE managed_entity
    SET deleted_at = NEW.deleted_at
    WHERE managed_entity_type = 'organization'
      AND ref_id = NEW.id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

---split---
DROP TRIGGER IF EXISTS trg_cascade_organization_soft_delete ON organization;

---split---
CREATE TRIGGER trg_cascade_organization_soft_delete
AFTER UPDATE OF deleted_at ON organization
FOR EACH ROW EXECUTE FUNCTION cascade_organization_soft_delete();

---split---
-- venue
CREATE OR REPLACE FUNCTION cascade_venue_soft_delete()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE managed_entity
    SET deleted_at = NEW.deleted_at
    WHERE managed_entity_type = 'venue'
      AND ref_id = NEW.id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

---split---
DROP TRIGGER IF EXISTS trg_cascade_venue_soft_delete ON venue;

---split---
CREATE TRIGGER trg_cascade_venue_soft_delete
AFTER UPDATE OF deleted_at ON venue
FOR EACH ROW EXECUTE FUNCTION cascade_venue_soft_delete();

---split---
-- facility
CREATE OR REPLACE FUNCTION cascade_facility_soft_delete()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE managed_entity
    SET deleted_at = NEW.deleted_at
    WHERE managed_entity_type = 'facility'
      AND ref_id = NEW.id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

---split---
DROP TRIGGER IF EXISTS trg_cascade_facility_soft_delete ON facility;

---split---
CREATE TRIGGER trg_cascade_facility_soft_delete
AFTER UPDATE OF deleted_at ON facility
FOR EACH ROW EXECUTE FUNCTION cascade_facility_soft_delete();
