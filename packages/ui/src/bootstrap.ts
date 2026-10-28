// Keep the application bootstrap path independent from the full component barrel. Importing the
// root package here would make data-grid, charts, and route-only components part of the initial
// dependency graph even though the application pages themselves are lazy-loaded.
export * from './components/material/VxAlert'
export * from './components/material/VxCssBaseline'
export * from './components/material/VxThemeProvider'
