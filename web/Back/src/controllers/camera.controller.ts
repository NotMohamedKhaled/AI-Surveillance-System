import { Request, Response } from "express";
import {
  getAllCamerasService,
  createCameraService,
  getCameraByIdService,
  updateCameraByIdService,
  deleteCameraByIdService,
  restoreCameraByIdService,
  cameraHeartbeatService,
  toggleCameraService,
  getAllCamerasAiService,
  createCameraAlertService,
} from "../services/camera.service";
import { ICamera } from "../models/camera.model";
import { IAlert } from "../models/alert.model";


export const getCamerasForAI = async (req: Request, res: Response) => {
  try {
    const cameras = await getAllCamerasAiService();
    return res.status(200).json(cameras);
  } catch (error: any) {
    return res.status(404).json({ message: error.message });
  }
};


export const createCameraAlert = async (req: Request, res: Response) => {
  try {
    const cameraAiId = req.params.cameraAiId as string;
    const frameImageUrl = req.file? `/uploads/${req.file.filename}`: undefined;

    let { type, confidence, timestamp } = req.body;
    timestamp = timestamp? new Date(timestamp): Date.now()

    const alert = await createCameraAlertService(<IAlert>{
      cameraAiId,
      type,
      confidence,
      timestamp,
      frameImageUrl,
    });

    return res.status(201).json({message: "Alert created",data: alert});

  } catch (err: any) {

    return res.status(400).json({ message: err.message});

  }
};

export const cameraHeartBeat = async (req: Request, res: Response) => {
  try {
    const cameraAiId = req.params.cameraAiId as string;
    const camera = await cameraHeartbeatService(cameraAiId);
    return res.status(200).json({ message: "Heartbeat received", data: camera });
  } catch (error: any) {
    return res.status(404).json({ message: error.message });
  }
};




export const getAllCameras = async (req: Request, res: Response) => {
  try {
    const role = req.user.role;
    const cameras = await getAllCamerasService(role);
    return res.status(200).json({ message: "Cameras list", data: cameras });
  } catch (error: any) {
    return res.status(404).json({ message: error.message });
  }
};

export const createCamera = async (req: Request, res: Response) => {
  try {
    const cameraInfo = req.body as ICamera;
    const camera = await createCameraService(cameraInfo);
    return res.status(200).json({ message: "Camera created successfully", data: camera });
  } catch (error: any) {
    return res.status(404).json({ message: error.message });
  }
};

export const getCameraById = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const camera = await getCameraByIdService(id, req.user.role);
    return res.status(200).json({ message: "Camera data", data: camera });
  } catch (error: any) {
    return res.status(404).json({ message: error.message });
  }
};

export const updateCameraById = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const updatedCamera = await updateCameraByIdService(id, req.body);
    return res.status(200).json({ message: "Camera updated successfully", data: updatedCamera });
  } catch (error: any) {
    return res.status(404).json({ message: error.message });
  }
};

export const deleteCameraById = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const deletedCamera = await deleteCameraByIdService(id);
    return res.status(200).json({ message: "Camera deleted", data: deletedCamera });
  } catch (error: any) {
    return res.status(404).json({ message: error.message });
  }
};

export const restoreCameraById = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const restoredCamera = await restoreCameraByIdService(id);
    return res.status(200).json({ message: "Camera restored", data: restoredCamera });
  } catch (error: any) {
    return res.status(404).json({ message: error.message });
  }
};



export const toggleCamera = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { isEnabled } = req.body as { isEnabled: boolean };
    const camera = await toggleCameraService(id, isEnabled);
    return res.status(200).json({ message: "Camera toggle updated", data: camera });
  } catch (error: any) {
    return res.status(404).json({ message: error.message });
  }
};
