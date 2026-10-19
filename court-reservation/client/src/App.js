import { ConfigProvider } from "antd";
import AppController from "./components/AppController";
import { AuthProvider } from "./auth/AuthContext";

const theme = {
  token: {
    colorPrimary: "#1769F5",
    fontFamily: "'Poppins', Helvetica, sans-serif",
    borderRadius: 8,
  },
};

function App() {
  return (
    <ConfigProvider theme={theme}>
      <AuthProvider>
        <AppController />
      </AuthProvider>
    </ConfigProvider>
  );
}

export default App;
