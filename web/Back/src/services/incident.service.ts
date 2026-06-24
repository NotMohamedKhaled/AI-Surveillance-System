import Incident, {
  CreateIncidentDto,
  UpdateIncidentDto,
  IncidentStatus,
} from "../models/incident.model";

import Alert, { AlertStatus } from "../models/alert.model";
import Camera from "../models/camera.model";
import { nextSeq } from "../models/counter.model";

import { Types } from "mongoose";
import User, { UserRole } from "../models/user.model";
import { getDashboardNamespace } from "../sockets";
import {
  ALERT_UPDATED,
  INCIDENT_CREATED,
  INCIDENT_UPDATED,
  INCIDENT_DELETED,
  INCIDENT_RESTORED,
} from "../sockets/events";



/**
 * Create Incident
 * `resolvedHandlerId` is the assignee (security user), resolved by controller by role.
 */
export const createIncidentService = async (
  data: CreateIncidentDto,
  resolvedHandlerId: string
) => {
  const alert = await Alert.findById(data.alertId);

  if (!alert || alert.isDeleted) {
    throw new Error("Alert not found");
  }

  const handlerUser = await User.findById(resolvedHandlerId);

  if (!handlerUser || handlerUser.isDeleted) {
    throw new Error("User not found");
  }

  if (handlerUser.role !== UserRole.SECURITY) {
    throw new Error("Incident must be assigned to a security user");
  }

  const camera = await Camera.findById(data.cameraId);

  if (!camera || camera.isDeleted) {
    throw new Error("Camera not found");
  }

  const existingIncident = await Incident.findOne({
    alertId: data.alertId,
  });

  if (existingIncident) {
    throw new Error("Incident already exists for this alert");
  }

  const incSid = await nextSeq("incident");
  const incident = await Incident.create({
    alertId: new Types.ObjectId(data.alertId),
    cameraId: new Types.ObjectId(data.cameraId),
    handledBy: new Types.ObjectId(resolvedHandlerId),
    frameImageUrl: data.frameImageUrl,
    status: IncidentStatus.OPEN,
    sid: incSid,
    alertSid: typeof alert.sid === "number" ? alert.sid : undefined,
  });

  await Alert.findByIdAndUpdate(data.alertId, {
    status: AlertStatus.INCIDENT_CREATED,
  });

  const updatedAlert = await Alert.findById(data.alertId).lean();
  const nsp = getDashboardNamespace();
  if (updatedAlert) {
    nsp.emit(ALERT_UPDATED, updatedAlert);
  }
  nsp.emit(INCIDENT_CREATED, incident);
  nsp.to(`camera:${incident.cameraId.toString()}`).emit(INCIDENT_CREATED, incident);
  console.log("[Socket] INCIDENT_CREATED emitted for incident", incident._id.toString(), "camera", incident.cameraId.toString());

  return incident;
};




/**
 * Get all incidents
 * Role-based filtering
 */
export const getAllIncidentsService = async (role: UserRole) => {

  if (role === UserRole.SUPER_ADMIN || role === UserRole.ADMIN) {
    return await Incident.find()
      .sort({ createdAt: -1 })
      .populate("cameraId", "cameraAiId name location")
      .populate("alertId", "type confidence timestamp sid frameImageUrl")
      .populate("handledBy", "name email")
      .lean();
  }

  return await Incident.find({ isDeleted: false })
    .sort({ createdAt: -1 })
    .populate("cameraId", "cameraAiId name location")
    .populate("alertId", "type confidence timestamp sid frameImageUrl")
    .populate("handledBy", "name email")
    .lean();
};



/**
 * Get incident by ID
 */export const getIncidentByIdService = async (id: string) => {

  if (!Types.ObjectId.isValid(id)) {
    throw new Error("Invalid incident ID");
  }

  const incident = await Incident.findOne({
    _id: id
  })
    .populate("cameraId", "cameraAiId name location")
    .populate("alertId", "type confidence timestamp sid frameImageUrl")
    .populate("handledBy", "name email");

  if (!incident) {
    throw new Error("Incident not found");
  }

  return incident;
};




/**
 * Get incidents by Camera
 */
export const getIncidentsByCameraService = async (cameraId: string) => {

  if (!Types.ObjectId.isValid(cameraId)) {
    throw new Error("Invalid camera ID");
  }

  const incident = await Incident.find({
    cameraId: new Types.ObjectId(cameraId),
  }).sort({ createdAt: -1 })
    .populate("alertId", "type confidence timestamp sid frameImageUrl")
    .populate("handledBy", "name email")
    .lean();
    

  return incident;
};




/**
 * Get incidents by Alert
 */
export const getIncidentsByAlertService = async (alertId: string) => {

  if (!Types.ObjectId.isValid(alertId)) {
    throw new Error("Invalid alert ID");
  }


  return await Incident.find({
    alertId: new Types.ObjectId(alertId),
  })
    .populate("cameraId", "cameraAiId name location")
    .populate("handledBy", "name email")
    .lean();
};




/**
 * Update Incident
 * Used for:
 * - assign handler (admin/super_admin only)
 * - change status
 * - add notes
 * - resolve incident
 */
export const updateIncidentService = async (
  id: string,
  data: UpdateIncidentDto,
  ctx: { role: UserRole; userId: string }
) => {
  if (!Types.ObjectId.isValid(id)) {
    throw new Error("Invalid incident ID");
  }

  const incident = await Incident.findById(id);

  if (!incident) {
    throw new Error("Incident not found");
  }

  const handlerId = incident.handledBy?.toString();
  const isOwner =
    handlerId && ctx.userId && handlerId === String(ctx.userId);

  if (ctx.role === UserRole.SECURITY) {
    if (!isOwner) {
      throw new Error("You can only update incidents assigned to you");
    }
    if (data.handledBy !== undefined) {
      throw new Error("You cannot reassign the incident handler");
    }
  } else if (ctx.role === UserRole.ADMIN || ctx.role === UserRole.SUPER_ADMIN) {
    if (data.handledBy !== undefined) {
      const nu = await User.findById(data.handledBy);
      if (!nu || nu.isDeleted) {
        throw new Error("User not found");
      }
      if (nu.role !== UserRole.SECURITY) {
        throw new Error("Incident handler must be a security user");
      }
    }
  } else {
    throw new Error("Forbidden");
  }

  const patch: Record<string, unknown> = { ...data };
  if (data.handledBy !== undefined) {
    patch.handledBy = new Types.ObjectId(data.handledBy);
  }

  if (patch.status === IncidentStatus.CLOSED && !patch.resolvedAt) {
    patch.resolvedAt = new Date();
  }

  const updatedIncident = await Incident.findByIdAndUpdate(id, patch, {
    new: true,
    runValidators: true,
  })
    .populate("cameraId", "cameraAiId name location")
    .populate("alertId", "type confidence timestamp sid frameImageUrl")
    .populate("handledBy", "name email");

  const nsp = getDashboardNamespace();
  if (updatedIncident) {
    nsp.emit(INCIDENT_UPDATED, updatedIncident);
    nsp
      .to(`camera:${updatedIncident.cameraId.toString()}`)
      .emit(INCIDENT_UPDATED, updatedIncident);
    console.log("[Socket] INCIDENT_UPDATED emitted for incident", updatedIncident._id.toString(), "camera", updatedIncident.cameraId.toString());
  }

  return updatedIncident;
};


/**
 * Delete Incident (soft delete optional)
 * Currently hard delete
 */
export const deleteIncidentService = async (id: string) => {

  if (!Types.ObjectId.isValid(id)) {
    throw new Error("Invalid incident ID");
  }

  const incident = await Incident.findByIdAndUpdate(
    id,
    { isDeleted: true },
    { new: true }
  );

  if (!incident) {
    throw new Error("Incident not found");
  }

  const nsp = getDashboardNamespace();
  nsp.emit(INCIDENT_DELETED, incident);
  nsp.to(`camera:${incident.cameraId.toString()}`).emit(INCIDENT_DELETED, incident);
  console.log("[Socket] INCIDENT_DELETED emitted for incident", incident._id.toString(), "camera", incident.cameraId.toString());

  return incident;
};



/**
 * Restore Incident
 * Only needed if using soft delete
 */
export const restoreIncidentService = async (id: string) => {

  if (!Types.ObjectId.isValid(id)) {
    throw new Error("Invalid incident ID");
  }

  const incident = await Incident.findByIdAndUpdate(
    id,
    { isDeleted: false },
    { new: true }
  );

  if (!incident) {
    throw new Error("Incident not found");
  }

  const nsp = getDashboardNamespace();
  nsp.emit(INCIDENT_RESTORED, incident);
  nsp.to(`camera:${incident.cameraId.toString()}`).emit(INCIDENT_RESTORED, incident);
  console.log("[Socket] INCIDENT_RESTORED emitted for incident", incident._id.toString(), "camera", incident.cameraId.toString());

  return incident;
};