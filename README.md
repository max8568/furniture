# RoomFit Furniture Planner

RoomFit is a React single-page application for arranging furniture on a measured floor plan. Users can edit furniture dimensions, add, drag, and rotate items while checking clearances from walls and nearby furniture.

## Run locally

```bash
npm install
npm run dev
```

Run the test suite and create a production build:

```bash
npm test
npm run build
```

## Live site

Every push to `main` triggers a GitHub Actions workflow that tests, builds, and deploys the application:

<https://max8568.github.io/furniture/>

## Room configuration

The room polygon, wall segments, doors, windows, columns, and furniture dimensions are defined in `src/config.ts`. Canvas coordinates use centimeters, so updating the `ROOM` definition does not require changes to the geometry, snapping, or distance-measurement logic.

The current room is based on the measurements in `room.png`. Its overall footprint is 401 × 224 cm, with a 96 × 73 cm recess in the upper-left corner and an 80 cm doorway.
