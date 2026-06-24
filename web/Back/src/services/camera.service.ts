import { UserRole } from "../models/user.model";
import Camera, { CameraStatus, ICamera, UpdateCameraInput } from "../models/camera.model";
import Alert, { IAlert } from "../models/alert.model";
import { nextSeq } from "../models/counter.model";
import { getDashboardNamespace } from "../sockets";
import { ALERT_CREATED, CAMERA_STATUS_CHANGED, CAMERA_TOGGLED } from "../sockets/events";

async function attachAlertCounts(cameras: InstanceType<typeof Camera>[]) {
  if (!cameras.length) return [];
  const ids = cameras.map((c) => c._id);
  const agg = await Alert.aggregate([
    { $match: { cameraId: { $in: ids }, isDeleted: { $ne: true } } },
    { $group: { _id: "$cameraId", count: { $sum: 1 } } },
  ]);
  const map = new Map(agg.map((x) => [String(x._id), x.count as number]));
  return cameras.map((c) => {
    const o = c.toObject();
    return { ...o, alertCount: map.get(String(c._id)) || 0 };
  });
}

export const getAllCamerasService = async (role: UserRole) => {
  let cameras: InstanceType<typeof Camera>[];
  if (role === UserRole.SECURITY) {
    cameras = await Camera.find({ isDeleted: false }).sort({ createdAt: -1 });
  } else {
    cameras = await Camera.find().sort({ createdAt: -1 });
  }
  if (!cameras) throw new Error("no cameras found");
  return attachAlertCounts(cameras);
};
export const getAllCamerasAiService = async () => {
 const cameras = await Camera.find({
    isDeleted: false,
    isEnabled: true,
  }).select("cameraAiId rtspUrl name");
  if(!cameras) throw new Error("No cameras are found")
  return cameras;
}


export const createCameraAlertService = async (data: IAlert) => {

  const camera = await Camera.findOne({
    cameraAiId: data.cameraAiId,
    isDeleted: false,
    isEnabled: true,
  });

  if (!camera) {
    throw new Error("Camera not found or disabled");
  }


  const sid = await nextSeq("alert");
  const alert = await Alert.create({ ...data, cameraId: camera._id, sid });

  const nsp = getDashboardNamespace();
  nsp.emit(ALERT_CREATED, alert);
  nsp.to(`camera:${camera._id.toString()}`).emit(ALERT_CREATED, alert);
  console.log("[Socket] ALERT_CREATED emitted for camera", camera._id.toString(), "alert", alert._id.toString());

  return alert;
};



export const createCameraService = async (cameraInfo: ICamera) => {
    const cameraAiId = await Camera.findOne({ cameraAiId: cameraInfo.cameraAiId })
    if (cameraAiId) throw new Error('cameraAiId must be unique')

    const rtspUrl = await Camera.findOne({ rtspUrl: cameraInfo.rtspUrl })
    if (rtspUrl) throw new Error('RTSP URL must be unique')

    const camera = await Camera.create(cameraInfo);
    return camera;
}


export const getCameraByIdService = async (id: string, role?: UserRole) => {
  if (role === UserRole.SECURITY) {
    const camera = await Camera.findOne({ _id: id, isDeleted: false });
    if (!camera) throw new Error("Camera not found");
    return camera;
  }
  const camera = await Camera.findById(id);
  if (!camera) throw new Error("Camera not found");
  return camera;
};


export const updateCameraByIdService = async (id: string, cameraInfo: UpdateCameraInput) => {
    const camera = await Camera.findOne({
        _id: id,
        isDeleted: false,
    });

    if (!camera) throw new Error('Camera not found')

    if (cameraInfo.cameraAiId) {
        const cameraIdExists = await Camera.findOne({
            cameraAiId: cameraInfo.cameraAiId,
            _id: { $ne: id },
        });

        if (cameraIdExists) {
            throw new Error("cameraAiId already exists");
        }
    }

    if (cameraInfo.rtspUrl) {

        const rtspExists = await Camera.findOne({
            rtspUrl: cameraInfo.rtspUrl,
            _id: { $ne: id },
        });

        if (rtspExists) {
            throw new Error("RTSP URL already exists");
        }
    }

    const updatedCamera = await Camera.findByIdAndUpdate(
        id,
        cameraInfo,
        {
            new: true,
            runValidators: true,
        }
    );

    return updatedCamera;
}


export const deleteCameraByIdService = async (id: string) => {
    const camera = await Camera.findByIdAndUpdate(
        id,
        { isDeleted: true },
        {
            new: true,
            runValidators: true,
        }
    );
    if(!camera){
        throw new Error('camera not found');
    }
    return camera;

}


export const restoreCameraByIdService = async (id: string) => {
   const camera = await Camera.findByIdAndUpdate(
        id,
        { isDeleted: false },
        {
            new: true,
            runValidators: true,
        }
    );
    if(!camera){
        throw new Error('camera not found');
    }
    return camera;
}


export const cameraHeartbeatService = async (cameraAiId: string) => {

    //if (now - lastHeartbeatAt > 15s) camera.status = OFFLINE SHOULD DO IT ON WATCHER
  const camera = await Camera.findOne({cameraAiId , isDeleted:false , isEnabled:true});

  if (!camera ) {
    throw new Error("Camera not found");
  }

  const wasOffline = camera.status !== CameraStatus.ONLINE;

  // Update status and heartbeat timestamp
  camera.status = CameraStatus.ONLINE;
  camera.lastHeartbeat = new Date();

  await camera.save();

  if (wasOffline) {
    const nsp = getDashboardNamespace();
    nsp.emit(CAMERA_STATUS_CHANGED, camera);
    nsp.to(`camera:${camera._id.toString()}`).emit(CAMERA_STATUS_CHANGED, camera);
    console.log("[Socket] CAMERA_STATUS_CHANGED emitted for camera", camera._id.toString(), "status", camera.status);
  }

  return camera;
};

export const toggleCameraService = async (id: string, toggle: boolean) => {
  const camera = await Camera.findOneAndUpdate(
    { _id: id, isDeleted: false },
    { isEnabled: toggle },
    {
      new: true,        
      runValidators: true, 
    }
  );
   if (!camera) {
     throw new Error('camera not found');
   }

   const nsp = getDashboardNamespace();
   nsp.emit(CAMERA_TOGGLED, camera);
   nsp.to(`camera:${camera._id.toString()}`).emit(CAMERA_TOGGLED, camera);
   console.log("[Socket] CAMERA_TOGGLED emitted for camera", camera._id.toString(), "isEnabled", camera.isEnabled);

   return camera;


}

export const markStaleCamerasOffline = async (thresholdMs: number) => {
  const cutoff = new Date(Date.now() - thresholdMs);

  const staleCameras = await Camera.find({
    isDeleted: false,
    isEnabled: true,
    status: { $ne: CameraStatus.OFFLINE },
    lastHeartbeat: { $exists: true, $lt: cutoff },
  });

  if (!staleCameras.length) {
    return 0;
  }

  const nsp = getDashboardNamespace();

  for (const camera of staleCameras) {
    camera.status = CameraStatus.OFFLINE;
    await camera.save();

    nsp.emit(CAMERA_STATUS_CHANGED, camera);
    nsp.to(`camera:${camera._id.toString()}`).emit(CAMERA_STATUS_CHANGED, camera);
    console.log("[Socket] CAMERA_STATUS_CHANGED emitted (offline) for camera", camera._id.toString());
  }

  return staleCameras.length;
}