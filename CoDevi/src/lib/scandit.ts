import {
  DataCaptureContext,
  Camera,
  FrameSourceState,
  DataCaptureView,
} from "@scandit/web-datacapture-core";
import { barcodeCaptureLoader } from "@scandit/web-datacapture-barcode";

export const SCANDIT_LICENSE_KEY =
  "AhNHji+1CE3bEFujtu6n894sXhF6A9okxQTlK+D1UNQSfYeNVWHNjoRSWM4qCSftvk0WdTxiAdjMcT2eG0bkrN1/HOUpPTQEc0nPsqw3YosIMaiLSCbIulsm2zRNM9nqu/FdXoF7N47rNW8dXU28UnN/c67+fqqHyrVfpUnqKMStT3r2hZ8gjsR7HKjuyzDctNbczoxtTHoBiLbIbM5YVQ1HGsn0RrMeo4McjEbXj1xpbH91fsn4lC58C4Lh6BzwOdezNaivzYC8eNwMHV0Rpn7N/dQU5vjjMd2CvBJHP2FitZNxdhl2fAXHhi1i1wKKb7fMC3/IzwTvR0t8ocbjIgMculOCvvcaKTrcDlzK9zufD/wJKWw7m6/tVil5QxqCG92acTwX2suf2bJerNjOj5JXayYMI8v++aIiOtS5uaTD3rt88JLy9euV/BGVS+ZJi8Ap9YhVKAxQJNN5zWVxMMGKpEfiL5q4UUKvz9TCoKJoUuhvRZzdadErqhnLFCWShYisKI3sbLYNokRdHWvrdvb0UXDnjotoTZRbF3NIPI/lX9g1z67XSvdBqdo1bOGNl/ZOQb4cWL+NkTARWFvhqcfbMKrYqzXgMaQDYwJesi753dVwFYLGk8bSPQqk/0aukkKEP/f6Rosu8VJNZWBhLN2PCzZBYxRNDkNZciAtK+x+YVGPE5NbOLqBPetFFcnDXB0t5ele9+PZ34Be4i01JDoyyGp076FLvSGQ2DtMgfdn7UWVUKnPs2/ca2dP52AiRgTIlBEHlkXDasRHJQtgJROnw2KzBQxlnNT/O1Ss";

export const SCANDIT_LIBRARY_LOCATION =
  "https://cdn.jsdelivr.net/npm/@scandit/web-datacapture-barcode@8/sdc-lib/";

let contextPromise: Promise<DataCaptureContext> | null = null;

export function ensureScanditContext(): Promise<DataCaptureContext> {
  if (contextPromise) return contextPromise;
  contextPromise = DataCaptureContext.forLicenseKey(SCANDIT_LICENSE_KEY, {
    libraryLocation: SCANDIT_LIBRARY_LOCATION,
    moduleLoaders: [barcodeCaptureLoader()],
  });
  return contextPromise;
}

export { DataCaptureContext, Camera, FrameSourceState, DataCaptureView };
