import React from 'react';
import { Text, TextProps } from 'react-native';
import { CONTROL_MAX_FONT_SCALE, READING_MAX_FONT_SCALE, TEXT_ROLE, TextRole } from '../../theme/typography';

export interface AppTextProps extends TextProps {
  textRole?: TextRole;
}

/** Explicit public Text API; long-form reading does not depend on the font patch. */
export function AppText({ textRole = 'body', style, ...props }: AppTextProps) {
  const reading = textRole === 'body' || textRole === 'reading' || textRole === 'caption';
  return <Text
    allowFontScaling
    maxFontSizeMultiplier={reading ? READING_MAX_FONT_SCALE : CONTROL_MAX_FONT_SCALE}
    {...props}
    style={[TEXT_ROLE[textRole], style]}
  />;
}
