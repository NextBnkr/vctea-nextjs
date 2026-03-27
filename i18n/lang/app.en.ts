const translation = {
  common: {
    welcome: 'Welcome to use',
    appUnavailable: 'App is unavailable',
    appUnkonwError: 'App is unavailable',
    optional: 'Optional',
  },
  generation: {
    tabs: {
      create: 'Run Once',
      batch: 'Run Batch',
      saved: 'Saved',
    },
    queryTitle: 'Query content',
    minimalTitle: 'Core Information',
    minimalDesc: 'Provide key project facts and get actionable investor-fit conclusions.',
    fieldCount: '{{count}} workflow input fields detected',
    advancedTitle: 'Advanced Information',
    advancedDesc: 'Defaults will apply if empty. Expand for better precision.',
    completionResult: 'Completion result',
    queryPlaceholder: 'Write your query content...',
    run: 'Execute',
    copy: 'Copy',
    title: 'Investor Match Result',
    brandSubtitle: 'Investor matching assistant for founders',
    badgeOne: 'Structured conclusion',
    badgeTwo: 'Professional wording',
    badgeThree: 'Workflow-native analysis',
    resultTitle: 'AI Completion',
    noData: 'AI will give you what you want here.',
    csvUploadTitle: 'Drag and drop your CSV file here, or ',
    browse: 'browse',
    csvStructureTitle: 'The CSV file must conform to the following structure:',
    downloadTemplate: 'Download the template here',
    field: 'Field',
    batchFailed: {
      info: '{{num}} failed executions',
      retry: 'Retry',
      outputPlaceholder: 'No output content',
    },
    errorMsg: {
      empty: 'Please input content in the uploaded file.',
      fileStructNotMatch: 'The uploaded CSV file not match the struct.',
      emptyLine: 'Row {{rowIndex}} is empty',
      invalidLine: 'Row {{rowIndex}}: {{varName}} value can not be empty',
      moreThanMaxLengthLine: 'Row {{rowIndex}}: {{varName}} value can not be more than {{maxLength}} characters',
      atLeastOne: 'Please input at least one row in the uploaded file.',
    },
    privacyPolicyLeft:
      'Please read the ',
    privacyPolicyMiddle:
      'privacy policy',
    privacyPolicyRight:
      ' provided by the app developer.',
  },
  errorMessage: {
    valueOfVarRequired: 'Variables value can not be empty',
    queryRequired: 'Request text is required.',
    waitForResponse: 'Please wait for the response to the previous message to complete.',
    waitForImgUpload: 'Please wait for the image to upload',
  },
}

export default translation
