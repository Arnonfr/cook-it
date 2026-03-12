# Cookit: Google Recipe Search Status Summary

## Goal

The app was updated to work as a recipe search engine:

- search recipe pages on the internet
- show recipe-oriented results in a comfortable UI
- extract a clean recipe view from a selected result

## What Was Implemented

### Frontend

Updated the search experience in:

- `/Users/hyh/Documents/cookit/frontend/src/App.tsx`
- `/Users/hyh/Documents/cookit/frontend/src/components/RecipeResult.tsx`
- `/Users/hyh/Documents/cookit/frontend/src/index.css`
- `/Users/hyh/Documents/cookit/frontend/index.html`

Changes include:

- redesigned search-first homepage
- improved recipe result cards
- filters for relevant / quick / easy
- loading / empty / error states
- recipe extraction flow from result URL

### Backend

Updated search + parsing logic in:

- `/Users/hyh/Documents/cookit/backend/src/services/GoogleSearchService.ts`
- `/Users/hyh/Documents/cookit/backend/src/services/RecipeParserService.ts`
- `/Users/hyh/Documents/cookit/backend/src/utils/recipeTransforms.ts`
- `/Users/hyh/Documents/cookit/backend/src/data/mockRecipes.ts`

Behavior:

- if Google Custom Search works, backend should use Google Custom Search JSON API
- if Google is unavailable/fails, backend currently falls back to web/mock behavior
- parser extracts `Recipe` schema / JSON-LD from recipe pages when available

## Current Google Configuration

Saved in:

- `/Users/hyh/Documents/cookit/backend/.env`

Current values used:

- `GOOGLE_API_KEY`: provided by user
- `GOOGLE_CX`: `66f41f7f23d3e4d76`

## Direct Check Performed

A direct request was made to Google Custom Search JSON API with the provided key and `cx`.

Google response:

- HTTP `403`
- `PERMISSION_DENIED`
- message:
  `This project does not have the access to Custom Search JSON API.`

## Meaning of the Error

This means the failure is not in the app code itself.

The Google project behind the API key currently does **not** have valid access to `Custom Search JSON API`.

Most likely causes:

1. `Custom Search JSON API` is not enabled on the same Google Cloud project as the API key
2. the API key belongs to a different project than the one where the search engine/API was configured
3. API key restrictions block `customsearch.googleapis.com`
4. billing / project activation is incomplete on the target project
5. propagation delay if the API was only just enabled

## What Needs To Be Checked By Whoever Continues

In Google Cloud Console:

1. verify the active project is the same project that owns the API key
2. verify `Custom Search JSON API` is enabled in that exact project
3. verify the API key is unrestricted or explicitly allows `Custom Search JSON API`
4. verify billing/project activation if required by Google
5. verify the programmable search engine is associated with the intended Google account/project setup

Relevant pages:

- https://console.cloud.google.com/apis/library/customsearch.googleapis.com
- https://console.cloud.google.com/apis/credentials
- https://console.cloud.google.com/apis/dashboard
- https://programmablesearchengine.google.com/

## Local Verification Status

Completed:

- frontend build passes
- backend build passes
- app UI was upgraded toward a recipe-search-engine flow
- backend request to Google was tested directly

Not completed:

- live Google search results through Custom Search API

Reason:

- blocked by Google project/API permission issue, confirmed by direct API response

## Additional Technical Note

Backend logs also showed Prisma DB save errors:

- table `Recipe` does not exist in local SQLite database

This does **not** block search itself, but it does mean caching/saving parsed recipes is not fully configured locally.

## Security Note

The API key was pasted into the conversation and written to `.env`.

Recommended:

1. rotate the API key after setup is fixed
2. create a new key
3. restrict it appropriately after confirming the API works
