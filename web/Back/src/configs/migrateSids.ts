import Alert from "../models/alert.model";
import Incident from "../models/incident.model";
import { nextSeq } from "../models/counter.model";

/** Backfill sid / alertSid for documents created before surrogate ids existed. */
export async function migrateAlertAndIncidentSids(): Promise<void> {
  const missingAlerts = await Alert.find({ sid: { $exists: false } })
    .sort({ createdAt: 1 })
    .lean();
  for (const a of missingAlerts) {
    const sid = await nextSeq("alert");
    await Alert.updateOne({ _id: a._id }, { $set: { sid } });
  }

  const missingIncidents = await Incident.find({ sid: { $exists: false } })
    .sort({ createdAt: 1 })
    .lean();
  for (const inc of missingIncidents) {
    const sid = await nextSeq("incident");
    const alert = await Alert.findById(inc.alertId).select("sid").lean();
    const patch: { sid: number; alertSid?: number } = { sid };
    if (alert && typeof (alert as { sid?: number }).sid === "number") {
      patch.alertSid = (alert as { sid: number }).sid;
    }
    await Incident.updateOne({ _id: inc._id }, { $set: patch });
  }

  const needAlertSid = await Incident.find({
    sid: { $exists: true },
    $or: [{ alertSid: { $exists: false } }, { alertSid: null }],
  }).lean();
  for (const inc of needAlertSid) {
    const alert = await Alert.findById(inc.alertId).select("sid").lean();
    if (alert && typeof (alert as { sid?: number }).sid === "number") {
      await Incident.updateOne(
        { _id: inc._id },
        { $set: { alertSid: (alert as { sid: number }).sid } }
      );
    }
  }
}
