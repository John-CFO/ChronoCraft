////////////////////////////ErrorBoundary Component////////////////////////////

// This component is used to catch errors in the app and show a message to the user.
// The user can also refresh the page to try again.

///////////////////////////////////////////////////////////////////////////////

import React from "react";
import { Text, View, TouchableOpacity } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

///////////////////////////////////////////////////////////////////////////////

type ErrorBoundaryState = {
  hasError: boolean;
};

///////////////////////////////////////////////////////////////////////////////

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  // constructor to initialize the state
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  // function to get the error
  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  // function to catch errors
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Caught by Error Boundary:", error, errorInfo);
  }

  // function to refresh the page
  handleRefresh = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "black",
            width: "100%",
            height: "100%",
          }}
        >
          {/* Error Message */}
          <Text
            style={{
              fontFamily: "MPLUSLatin_Bold",
              fontSize: 22,
              color: "white",
              marginBottom: 20,
              textAlign: "center",
            }}
          >
            Something went wrong
          </Text>
          {/* Refresh Button */}
          <TouchableOpacity
            onPress={this.handleRefresh}
            style={{
              marginTop: 30,
              width: 280,
              borderRadius: 12,
              overflow: "hidden",
              borderWidth: 3,
              borderColor: "white",
              marginBottom: 20,
            }}
          >
            <LinearGradient
              colors={["#00FFFF", "#FFFFFF"]}
              style={{
                alignItems: "center",
                justifyContent: "center",
                height: 45,
                width: 280,
              }}
            >
              <Text
                style={{
                  color: "grey",
                  fontSize: 22,
                  fontFamily: "MPLUSLatin_Bold",
                  marginBottom: 11,
                  marginRight: 9,
                }}
              >
                Refresh
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
