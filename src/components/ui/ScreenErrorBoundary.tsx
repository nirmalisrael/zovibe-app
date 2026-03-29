import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import { ErrorState } from './ErrorState';

type Props = { children: ReactNode };

type State = { err: Error | null };

export class ScreenErrorBoundary extends Component<Props, State> {
  state: State = { err: null };

  static getDerivedStateFromError(err: Error): State {
    return { err };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn('ScreenErrorBoundary', error.message, info.componentStack);
  }

  render() {
    if (this.state.err) {
      return (
        <View style={styles.wrap}>
          <ErrorState
            message={this.state.err.message || 'Something went wrong'}
            onRetry={() => this.setState({ err: null })}
          />
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'center' },
});
