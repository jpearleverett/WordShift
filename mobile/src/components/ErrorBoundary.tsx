import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { getSurfaceTheme, SurfaceTheme } from '../theme/surfaces';
import { getCurrentPhaseSync } from '../services/amberCurrency';
import { BODY_FONT, PIXEL_FONT_BOLD } from '../theme/fonts';
import { reportError } from '../services/errorReporting';
import { FONT_SIZE } from '../theme/typeScale';

// The crash card's spot (assets/ui/spots): an overturned inkpot beside a
// cracked tile. A static require resolves at bundle time, so it cannot itself
// throw inside the boundary that is rendering the fallback.
const SPILLED_INK = require('../../assets/ui/spots/spilled_ink.png');

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

  // Read the last-known phase off the synchronous cache so the crash screen
  // tracks the descent instead of flashing candy purple. Fully guarded — the
  // fallback UI must never itself throw; any failure falls back to bright.
  private surface(): SurfaceTheme {
    try {
      return getSurfaceTheme(getCurrentPhaseSync());
    } catch {
      return getSurfaceTheme(0);
    }
  }

  // Phase-aware title so the crash card doesn't stay chirpy "Oops!" through the
  // descent. Kept short + clear (a crash screen prioritizes legibility) and
  // fully guarded — the fallback UI must never itself throw.
  private title(): string {
    try {
      const p = getCurrentPhaseSync();
      if (p >= 4) return 'The pattern slipped.';
      if (p >= 2) return 'Something slipped.';
    } catch {
      // fall through to the bright default
    }
    return 'Oops!';
  }

  render() {
    if (this.state.hasError) {
      const t = this.surface();
      return (
        <View style={[styles.container, { backgroundColor: t.screenBg }]}>
          <View style={[styles.card, { backgroundColor: t.cardBg, borderColor: t.cardBorder }]}>
            {/* Neutral on-brand spot (spilled ink, a cracked tile), never a
                face emoji that reads as flippant during the descent. */}
            <Image source={SPILLED_INK} style={styles.markImage} resizeMode="contain" accessible={false} />
            <Text style={[styles.title, { color: t.title }]}>{this.title()}</Text>
            <Text style={[styles.message, { color: t.body }]}>
              {this.props.fallbackMessage || 'Something went wrong. Please try again.'}
            </Text>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: t.primaryBg, borderBottomColor: t.primaryEdge }]}
              onPress={this.handleReset}
              accessibilityLabel="Try again"
              accessibilityRole="button"
            >
              <Text style={[styles.buttonText, { color: t.primaryText }]}>Try Again</Text>
            </TouchableOpacity>
          </View>
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
    padding: 32,
  },
  card: {
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 28,
    paddingVertical: 30,
    maxWidth: 360,
  },
  markImage: {
    width: 72,
    height: 72,
    marginBottom: 14,
  },
  title: {
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: FONT_SIZE.hero,
    fontWeight: '900',
    marginBottom: 12,
  },
  message: {
    fontFamily: BODY_FONT,
    fontSize: FONT_SIZE.large,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  button: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 18,
    borderBottomWidth: 3,
  },
  buttonText: {
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: FONT_SIZE.title,
    fontWeight: '800',
  },
});
