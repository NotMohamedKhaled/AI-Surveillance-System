import Alert, { IAlert } from "../models/alert.model";
import { AlertStatus } from "../models/alert.model";
import { UserRole } from "../models/user.model";
import { getDashboardNamespace } from "../sockets";
import { ALERT_UPDATED } from "../sockets/events";

// export const createAlertService = async (data: IAlert) => {
//   const alert = await Alert.create({
//     ...data,
//     timestamp: data.timestamp ?? new Date(),
//   });
//   return alert;
// };

export const getAllAlertsService = async (role: UserRole) => {
  if (role === UserRole.SECURITY) {
    return Alert.find({ isDeleted: false }).sort({ createdAt: -1 }).lean();
  }
  return Alert.find().sort({ createdAt: -1 }).lean();
};

export const getAlertByIdService = async (id: string, role?: UserRole) => {
  if (role === UserRole.SECURITY) {
    const alert = await Alert.findOne({ _id: id, isDeleted: false }).lean();
    if (!alert) throw new Error("Alert not found");
    return alert;
  }
  const alert = await Alert.findOne({ _id: id }).lean();
  if (!alert) throw new Error("Alert not found");
  return alert;
};

export const markAlertFalseService = async (id: string, status: AlertStatus) => {
  const existing = await Alert.findOne({ _id: id, isDeleted: false });
  if (!existing) {
    throw new Error("Alert not found");
  }
  if (existing.status === AlertStatus.INCIDENT_CREATED) {
    throw new Error("Cannot change alert status after an incident is opened");
  }
  if (existing.status !== AlertStatus.NEW) {
    throw new Error("Only active (new) alerts can be marked as false");
  }
  if (status !== AlertStatus.FALSE) {
    throw new Error("Invalid status: only false is allowed for this action");
  }

  const alert = await Alert.findByIdAndUpdate(
    id,
    { status: AlertStatus.FALSE },
    { new: true }
  );

  if (!alert) {
    throw new Error("Alert not found");
  }

  const nsp = getDashboardNamespace();
  nsp.emit(ALERT_UPDATED, alert);
  console.log("[Socket] ALERT_UPDATED emitted for alert", alert._id.toString(), "status", alert.status);

  return alert;
};

export const deleteAlertService = async (id: string) => {
  const alert = await Alert.findByIdAndUpdate(id, { isDeleted: true }, { new: true });

  if (!alert) {
    throw new Error("Alert not found");
  }
  const nsp = getDashboardNamespace();
  nsp.emit(ALERT_UPDATED, alert);
  console.log("[Socket] ALERT_DELETED emitted for alert", alert._id.toString());

  return alert;
};

export const restoreAlertService = async (id: string) => {
  const prev = await Alert.findById(id);

  if (!prev) {
    throw new Error("Alert not found");
  }

  if (!prev.isDeleted) {
    throw new Error("Alert is already active");
  }

  const alert = await Alert.findByIdAndUpdate(
    id,
    { isDeleted: false },
    { new: true }
  );
  const nsp = getDashboardNamespace();
  nsp.emit(ALERT_UPDATED, alert);
  console.log("[Socket] ALERT_RESTORED emitted for alert", alert?._id.toString());
  return alert;
};

