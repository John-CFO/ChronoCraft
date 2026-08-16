////////////////////////////ErrorBoundary Component////////////////////////////

// This component is used to catch errors in the app and show a message to the user.
// The user can also refresh the page to try again.

///////////////////////////////////////////////////////////////////////////////

import React from "react";

import { logError } from "../lib/loggerClient";
import { ErrorBoundaryContent } from "./ErrorBoundaryContent";

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
    logError("ErrorBoundary/catch", { error, errorInfo });
  }

  // function to refresh the page
  handleRefresh = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return <ErrorBoundaryContent onRefresh={this.handleRefresh} />;
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
