import { Request, Response } from "express";
import {
  // createAlertService,
  getAllAlertsService,
  getAlertByIdService,
  markAlertFalseService,
  deleteAlertService,
  restoreAlertService,
} from "../services/alert.service";
import { AlertStatus, IAlert } from "../models/alert.model";

// export const createAlert = async (req: Request, res: Response) => {
//   try {
//     const alertData = req.body as IAlert;
//     const alert = await createAlertService(alertData);
//     return res
//       .status(200)
//       .json({ message: "Alert created successfully", data: alert });
//   } catch (error: any) {
//     return res.status(404).json({ message: error.message });
//   }
// };

export const getAllAlerts = async (req: Request, res: Response) => {
  try {
    const role = req.user.role;
    const alerts = await getAllAlertsService(role);
    return res.status(200).json({ message: "Alerts list", data: alerts });
  } catch (error: any) {
    return res.status(404).json({ message: error.message });
  }
};

export const getAlertById = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const alert = await getAlertByIdService(id, req.user.role);
    return res.status(200).json({ message: "Alert data", data: alert });
  } catch (error: any) {
    return res.status(404).json({ message: error.message });
  }
};

export const markAlertFalse = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const status = req.body.status as AlertStatus
    const alert = await markAlertFalseService(id,status);
    return res
      .status(200)
      .json({ message: "Alert marked as false", data: alert });
  } catch (error: any) {
    return res.status(404).json({ message: error.message });
  }
};

export const deleteAlert = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const alert = await deleteAlertService(id);
    return res
      .status(200)
      .json({ message: "Alert deleted successfully", data: alert });
  } catch (error: any) {
    return res.status(404).json({ message: error.message });
  }
};

export const restoreAlert = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const alert = await restoreAlertService(id);
    return res
      .status(200)
      .json({ message: "Alert restored successfully", data: alert });
  } catch (error: any) {
    return res.status(404).json({ message: error.message });
  }
};

