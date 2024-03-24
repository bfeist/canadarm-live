import styles from "./index.module.css";

import { FunctionComponent, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import { ColladaLoader } from "three/examples/jsm/loaders/ColladaLoader";
import * as THREE from "three";
import {
  LightstreamerClient,
  Subscription,
  ConsoleLogLevel,
  ConsoleLoggerProvider,
  ItemUpdate,
} from "lightstreamer-client-web/lightstreamer.esm";

interface SSRMSJointAngles {
  sr: number;
  sy: number;
  sp: number;
  ep: number;
  wp: number;
  wy: number;
  wr: number;
}

type AOSStatus = "Signal Acquired" | "Signal Lost" | "Stale Signal";

interface TelemetryStatus {
  AOStimestamp: number;
  AOS: AOSStatus;
  AOSnum: 0 | 1 | 2;
  timestampDifference: number;
}

const Scene = (): JSX.Element => {
  const classRef = useRef();

  const [jointAngles, setJointAngles] = useState<SSRMSJointAngles>({
    sr: 0,
    sy: 0,
    sp: 0,
    ep: 0,
    wp: 0,
    wy: 0,
    wr: 0,
  });
  const tempJointAnglesRef = useRef<SSRMSJointAngles>(jointAngles);

  const [telemetryStatus, setTelemetryStatus] = useState<TelemetryStatus>({
    AOStimestamp: 0,
    AOS: "Signal Lost",
    AOSnum: 0,
    timestampDifference: 0,
  });

  class LsClient {
    client: LightstreamerClient;

    constructor() {
      LightstreamerClient.setLoggerProvider(new ConsoleLoggerProvider(ConsoleLogLevel.WARN));
      // creates a subscription
      var sub = new Subscription(
        "MERGE",
        [
          "CSASSRMS001", // -1  SACS Operating Base eg: "LEE B"
          "CSASSRMS002", // Base Location eg: "MBS PDGF 3"
          "CSASSRMS003", // -4  SSRMS LEE Stop Condition ; -5 SSRMS LEE Run Speed ; -6 SSRMS LEE Hot
          "CSASSRMS004", // SR
          "CSASSRMS005", // SY
          "CSASSRMS006", // SP
          "CSASSRMS007", // EP
          "CSASSRMS008", // WP
          "CSASSRMS009", // WY
          "CSASSRMS010", // WR
          "CSASSRMS011", // SSRMS Tip LEE Payload Status eg "Captured"
        ],
        ["TimeStamp", "Value"]
      );

      var timeSub = new Subscription("MERGE", "TIME_000001", [
        "TimeStamp",
        "Value",
        "Status.Class",
        "Status.Indicator",
      ]);

      // subscribes to the ISS telemetry
      this.client = new LightstreamerClient(
        (document.location.protocol === "https:" ? "https" : "http") + "://push.lightstreamer.com",
        "ISSLIVE"
      );
      this.client.subscribe(sub);
      this.client.subscribe(timeSub);

      this.client.connect();

      sub.addListener({
        onSubscription: function () {
          console.log("Subscribed");
        },
        onUnsubscription: function () {
          console.log("Unsubscribed");
        },
        onItemUpdate: function (update: ItemUpdate) {
          // console.log(update.getValue("TimeStamp"));
          const name = update.getItemName();
          switch (name) {
            case "CSASSRMS004":
              tempJointAnglesRef.current["sr"] = parseFloat(update.getValue("Value"));
              break;
            case "CSASSRMS005":
              tempJointAnglesRef.current["sy"] = parseFloat(update.getValue("Value"));
              break;
            case "CSASSRMS006":
              tempJointAnglesRef.current["sp"] = parseFloat(update.getValue("Value"));
              break;
            case "CSASSRMS007":
              tempJointAnglesRef.current["ep"] = parseFloat(update.getValue("Value"));
              break;
            case "CSASSRMS008":
              tempJointAnglesRef.current["wp"] = parseFloat(update.getValue("Value"));
              break;
            case "CSASSRMS009":
              tempJointAnglesRef.current["wy"] = parseFloat(update.getValue("Value"));
              break;
            case "CSASSRMS010":
              tempJointAnglesRef.current["wr"] = parseFloat(update.getValue("Value"));
              break;
            default:
              break;
          }

          setJointAngles({ ...tempJointAnglesRef.current });
        },
      });

      timeSub.addListener({
        onItemUpdate: function (update) {
          var unixtime = new Date().getTime();
          var date = new Date(unixtime);
          var hoursUTC = date.getUTCHours();
          var minutes = "0" + date.getMinutes();
          var seconds = "0" + date.getSeconds();
          var timestmp = new Date().setFullYear(new Date().getFullYear(), 0, 1);
          var yearFirstDay = Math.floor(timestmp / 86400000);
          var today = Math.ceil(new Date().getTime() / 86400000);
          var dayOfYear = today - yearFirstDay;

          var status = update.getValue("Status.Class");
          const AOStimestamp = parseFloat(update.getValue("TimeStamp"));
          var timestampnow = +dayOfYear * 24 + hoursUTC + +minutes / 60 + +seconds / 3600;
          const difference = timestampnow - AOStimestamp;
          let AOS;
          let AOSnum;

          if (status === "24") {
            if (difference > 0.00153680542553047) {
              AOS = "Stale Signal";
              AOSnum = 2;
            } else {
              AOS = "Siqnal Acquired";
              AOSnum = 1;
            }
          } else {
            AOS = "Signal Lost";
            AOSnum = 0;
          }

          setTelemetryStatus({
            AOStimestamp,
            AOS: AOS as AOSStatus,
            AOSnum: AOSnum as 0 | 1 | 2,
            timestampDifference: difference,
          });
          // console.log(`AOS Status: ${AOS} | AOS ${update.getValue("TimeStamp")} ${AOSnum}`);
        },
      });
    }
  }

  // start the Lightstreamer client
  useEffect(() => {
    //@ts-ignore
    //eslint-disable-next-line
    classRef.current = new LsClient();
  }, []);

  return (
    <div className={styles.pageContainer}>
      <div className={styles.scene}>
        <Canvas>
          <ambientLight intensity={0.25} />
          <directionalLight position={[-1000, 1000, 1000]} intensity={1} />
          <gridHelper args={[50, 10]} />
          <Suspense fallback={null}>
            <Model jointAngles={jointAngles} />
          </Suspense>
          <PerspectiveCamera makeDefault position={[-100, 20, 5]} />
          <OrbitControls
            target={[0, 30, 0]}
            minPolarAngle={Math.PI / 2}
            maxPolarAngle={Math.PI / 2}
          />
        </Canvas>
      </div>
      <DataFields jointAngles={jointAngles} telemetryStatus={telemetryStatus} />
    </div>
  );
};

const Model: FunctionComponent<{
  jointAngles: SSRMSJointAngles;
}> = ({ jointAngles }) => {
  const modelRef = useRef<THREE.Object3D>();
  const { scene } = useThree();

  const [modelLoaded, setModelLoaded] = useState(false);

  const updateJointAngles = useCallback(() => {
    scene.traverse(function (child) {
      switch (child.name) {
        case "BASE":
          //child.rotation.x = THREE.deg(45);
          break;
        case "SR":
          child.rotation.x = THREE.MathUtils.degToRad(jointAngles.sr);
          break;
        case "SP":
          child.rotation.z = THREE.MathUtils.degToRad(jointAngles.sp);
          break;
        case "SY":
          child.rotation.y = THREE.MathUtils.degToRad(jointAngles.sy);
          break;
        case "EP":
          child.rotation.y = THREE.MathUtils.degToRad(jointAngles.ep);
          break;
        case "WP":
          child.rotation.x = THREE.MathUtils.degToRad(jointAngles.wp);
          break;
        case "WY":
          child.rotation.z = THREE.MathUtils.degToRad(jointAngles.wy);
          break;
        case "WR":
          child.rotation.x = THREE.MathUtils.degToRad(jointAngles.wr);
          break;
        case "Canadarm2":
          break;
      }
    });
  }, [jointAngles, scene]);

  useEffect(() => {
    const loader = new ColladaLoader();
    loader.load("models/canadarm2Vertical.dae", (model) => {
      model.scene.position.set(0, 3, 0);
      model.scene.rotation.x = THREE.MathUtils.degToRad(180);
      scene.add(model.scene);
      setModelLoaded(true);
      updateJointAngles();
    });
  }, []);

  useEffect(() => {
    console.log(`Model loaded: ${modelLoaded}`);
    if (!scene) return;
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.material = new THREE.MeshPhongMaterial({ color: 0xffffff });
      }
    });
  }, [modelLoaded]);

  //update the model's rotation based on the joint angles
  useEffect(() => {
    updateJointAngles();
  }, [scene, modelLoaded, jointAngles]);

  return <primitive object={scene} ref={modelRef} />;
};

export default Scene;

export const DataFields: FunctionComponent<{
  jointAngles: SSRMSJointAngles;
  telemetryStatus: TelemetryStatus;
}> = ({ jointAngles, telemetryStatus }) => {
  return (
    <div className={styles.dataFields}>
      <p>Shoulder Roll: {jointAngles.sr}</p>
      <p>Shoulder Yaw: {jointAngles.sy}</p>
      <p>Shoulder Pitch: {jointAngles.sp}</p>
      <p>Elbow Pitch: {jointAngles.ep}</p>
      <p>Wrist Pitch: {jointAngles.wp}</p>
      <p>Wrist Yaw: {jointAngles.wy}</p>
      <p>Wrist Roll: {jointAngles.wr}</p>

      <p>Telemetry Status: {telemetryStatus.AOS}</p>
      <p>Telemetry Age: {telemetryStatus.timestampDifference.toFixed(10)}</p>
    </div>
  );
};
