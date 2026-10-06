import { supabase } from "./supabase";

export const logAction = async ({ performedBy, action, entityType, entityId, details }) => {
  await supabase.from("audit_log").insert({
    performed_by: performedBy,
    action,
    entity_type: entityType,
    entity_id: entityId,
    details,
  });
};