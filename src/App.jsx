/**
 * @module App
 * @description Root application component.
 *              Renders AppRouter and global UI overlays (CommandSearch).
 */

import AppRouter     from '@routes/AppRouter.jsx';
import CommandSearch from '@components/common/CommandSearch.jsx';

export default function App() {
  return (
    <>
      <AppRouter />
      <CommandSearch />
    </>
  );
}
