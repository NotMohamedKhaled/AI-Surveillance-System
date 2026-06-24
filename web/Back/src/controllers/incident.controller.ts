import { Request, Response } from "express";
import {
  createIncidentService,
  getAllIncidentsService,
  getIncidentByIdService,
  getIncidentsByCameraService,
  getIncidentsByAlertService,
  updateIncidentService,
  deleteIncidentService,
  restoreIncidentService,
} from "../services/incident.service";

import { CreateIncidentDto, UpdateIncidentDto } from "../models/incident.model";
import { UserRole } from "../models/user.model";



export const createIncident = async (req: Request, res: Response) => {
  try {
    const incidentData = req.body as CreateIncidentDto;
    const role = req.user.role as UserRole;

    let resolvedHandlerId: string;
    if (role === UserRole.SECURITY) {
      resolvedHandlerId = req.user.id as string;
    } else if (role === UserRole.ADMIN || role === UserRole.SUPER_ADMIN) {
      if (!incidentData.handledBy) {
        return res.status(400).json({
          message: "handledBy is required when opening an incident as admin",
        });
      }
      resolvedHandlerId = incidentData.handledBy;
    } else {
      return res.status(403).json({ message: "Forbidden" });
    }

    const incident = await createIncidentService(incidentData, resolvedHandlerId);

    return res.status(201).json({
      message: "Incident created successfully",
      data: incident,
    });
  } catch (error: any) {
    return res.status(400).json({
      message: error.message,
    });
  }
};



export const getAllIncidents = async (req: Request, res: Response) => {
  try {
    const role = req.user.role;

    const incidents = await getAllIncidentsService(role);

    return res.status(200).json({
      message: "Incidents list",
      data: incidents,
    });

  } catch (error: any) {
    return res.status(404).json({
      message: error.message,
    });
  }
};



export const getIncidentById = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;

    const incident = await getIncidentByIdService(id);

    return res.status(200).json({
      message: "Incident data",
      data: incident,
    });

  } catch (error: any) {
    return res.status(404).json({
      message: error.message,
    });
  }
};



export const getIncidentsByCamera = async (req: Request, res: Response) => {
  try {
    const cameraId = req.params.cameraId as string;

    const incidents = await getIncidentsByCameraService(cameraId);

    return res.status(200).json({
      message: "Camera incidents",
      data: incidents,
    });

  } catch (error: any) {
    return res.status(404).json({
      message: error.message,
    });
  }
};



export const getIncidentsByAlert = async (req: Request, res: Response) => {
  try {
    const alertId = req.params.alertId as string;

    const incidents = await getIncidentsByAlertService(alertId);

    return res.status(200).json({
      message: "Alert incidents",
      data: incidents,
    });

  } catch (error: any) {
    return res.status(404).json({
      message: error.message,
    });
  }
};



export const updateIncident = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;

    const updateData = req.body as UpdateIncidentDto;

    const incident = await updateIncidentService(id, updateData, {
      role: req.user.role as UserRole,
      userId: req.user.id as string,
    });

    return res.status(200).json({
      message: "Incident updated successfully",
      data: incident,
    });
  } catch (error: any) {
    return res.status(400).json({
      message: error.message,
    });
  }
};



export const deleteIncident = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;

    const incident = await deleteIncidentService(id);

    return res.status(200).json({
      message: "Incident deleted successfully",
      data: incident,
    });

  } catch (error: any) {
    return res.status(404).json({
      message: error.message,
    });
  }
};



export const restoreIncident = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;

    const incident = await restoreIncidentService(id);

    return res.status(200).json({
      message: "Incident restored successfully",
      data: incident,
    });

  } catch (error: any) {
    return res.status(404).json({
      message: error.message,
    });
  }
};