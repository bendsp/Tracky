import { StyleSheet } from 'react-native';

import { radius } from '../../design/theme';

/**
 * Shared geometry for the two "pick one of these" grids — habit colours and
 * tracker icons. Same size, same circle, same ring width, same ring token, so
 * the icon picker and the colour picker read as one control one tap apart.
 *
 * Colour swatches additionally draw a checkmark: the swatch's own fill is the
 * content, so a ring alone is ambiguous. Icon tiles don't need one — the ring
 * against their plain background already reads as selected.
 */
export const SELECTION_RING = 3;

export const selectionTile = StyleSheet.create({
  tile: {
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: SELECTION_RING,
    height: 56,
    justifyContent: 'center',
    width: 56,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
});
