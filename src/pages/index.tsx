import styles from "./index.module.css";
import { commonExample } from "@/utils/utils";

const HomePage = (): JSX.Element => {
  commonExample();

  return (
    <div className={styles.app}>
      <img src="/images/nasa-logo.svg" alt="nasa logo" />
    </div>
  );
};

export default HomePage;
