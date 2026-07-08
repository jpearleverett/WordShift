import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { CandyColors } from '../theme/colors';
import { BODY_FONT, PIXEL_FONT_BOLD } from '../theme/fonts';
import { reportError } from '../services/errorReporting';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackMessage?: string;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Feed React render errors into the central crash pipeline so they reach
    // the event log (and any future Sentry/Crashlytics forwarder), not just
    // the dev console.
    reportError(error, {
      source: 'react_error_boundary',
      metadata: { componentStack: errorInfo.componentStack?.slice(0, 500) },
    });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.emoji}>😵</Text>
          <Text style={styles.title}>Oops!</Text>
          <Text style={styles.message}>
            {this.props.fallbackMessage || 'Something went wrong. Please try again.'}
          </Text>
          <TouchableOpacity
            style={styles.button}
            onPress={this.handleReset}
            accessibilityLabel="Try again"
            accessibilityRole="button"
          >
            <Text style={styles.buttonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: CandyColors.purple.main,
    padding: 32,
  },
  emoji: {
    fontFamily: BODY_FONT,
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: 28,
    fontWeight: '900',
    color: CandyColors.white,
    marginBottom: 12,
  },
  message: {
    fontFamily: BODY_FONT,
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  button: {
    backgroundColor: CandyColors.pink.main,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 20,
    shadowColor: CandyColors.pink.dark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonText: {
    fontFamily: PIXEL_FONT_BOLD,
    color: CandyColors.white,
    fontSize: 18,
    fontWeight: '800',
  },
});
