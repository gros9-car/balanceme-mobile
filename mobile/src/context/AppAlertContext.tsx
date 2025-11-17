import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { Modal, View, Text, TouchableOpacity, Alert } from "react-native";
import { useTheme } from "./ThemeContext";

type AlertOptions = {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
};

type AlertContextType = {
  showAlert: (...args: any[]) => void;
};

const AppAlertContext = createContext<AlertContextType | null>(null);

export const useAppAlert = () => {
  const ctx = useContext(AppAlertContext);
  if (!ctx) {
    throw new Error("useAppAlert must be used within AppAlertProvider");
  }
  return ctx;
};

type AppAlertProviderProps = {
  children: ReactNode;
};

export const AppAlertProvider = ({ children }: AppAlertProviderProps) => {
  const { colors } = useTheme();
  const [visible, setVisible] = useState(false);
  const [options, setOptions] = useState<AlertOptions | null>(null);

  const showAlert = (
    arg1: AlertOptions | string,
    arg2?: string,
    arg3?: Array<{ text: string; style?: "default" | "cancel" | "destructive"; onPress?: () => void }>,
  ) => {
    if (typeof arg1 === "string") {
      const title = arg1;
      const message = arg2 ?? "";
      const buttons = Array.isArray(arg3) ? arg3 : undefined;

      let confirmText: string | undefined;
      let onConfirm: (() => void) | undefined;
      let cancelText: string | undefined;
      let onCancel: (() => void) | undefined;

      if (buttons && buttons.length > 0) {
        const primaryButton =
          buttons.find((button) => button.style !== "cancel") ?? buttons[0];
        const cancelButton = buttons.find((button) => button.style === "cancel");

        confirmText = primaryButton?.text;
        onConfirm = primaryButton?.onPress;
        cancelText = cancelButton?.text;
        onCancel = cancelButton?.onPress;
      }

      setOptions({
        title,
        message,
        confirmText: confirmText ?? "Aceptar",
        cancelText,
        onConfirm,
        onCancel,
      });
    } else {
      const opts = arg1;

      setOptions({
        title: opts.title,
        message: opts.message,
        confirmText: opts.confirmText ?? "Aceptar",
        cancelText: opts.cancelText,
        onConfirm: opts.onConfirm,
        onCancel: opts.onCancel,
      });
    }

    setVisible(true);
  };

  const handleConfirm = () => {
    setVisible(false);
    if (options?.onConfirm) {
      options.onConfirm();
    }
  };

  const handleCancel = () => {
    setVisible(false);
    if (options?.onCancel) {
      options.onCancel();
    }
  };

  useEffect(() => {
    const originalAlert = Alert.alert;

    Alert.alert = (...args: any[]) => {
      (showAlert as (...args: any[]) => void)(...args);
    };

    return () => {
      Alert.alert = originalAlert;
    };
  }, []);

  return (
    <AppAlertContext.Provider value={{ showAlert }}>
      {children}

      <Modal
        transparent
        visible={visible}
        animationType="fade"
        onRequestClose={() => setVisible(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <View
            style={{
              width: "80%",
              borderRadius: 16,
              padding: 20,
              backgroundColor: colors.surface,
            }}
          >
            {options?.title ? (
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "bold",
                  marginBottom: 8,
                  color: colors.text,
                }}
              >
                {options.title}
              </Text>
            ) : null}

            {options?.message ? (
              <Text
                style={{
                  fontSize: 15,
                  marginBottom: 16,
                  color: colors.subText,
                }}
              >
                {options.message}
              </Text>
            ) : null}

            <View
              style={{
                flexDirection: "row",
                justifyContent: "flex-end",
                gap: 12,
              }}
            >
              {options?.cancelText ? (
                <TouchableOpacity
                  onPress={handleCancel}
                  style={{
                    paddingVertical: 8,
                    paddingHorizontal: 16,
                    borderRadius: 999,
                    backgroundColor: colors.muted,
                  }}
                >
                  <Text
                    style={{
                      color: colors.text,
                      fontWeight: "500",
                    }}
                  >
                    {options.cancelText}
                  </Text>
                </TouchableOpacity>
              ) : null}

              <TouchableOpacity
                onPress={handleConfirm}
                style={{
                  paddingVertical: 8,
                  paddingHorizontal: 16,
                  borderRadius: 999,
                  backgroundColor: colors.primary,
                }}
              >
                <Text
                  style={{
                    color: colors.primaryContrast,
                    fontWeight: "600",
                  }}
                >
                  {options?.confirmText}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </AppAlertContext.Provider>
  );
};
