/** 对齐 social_media_web CEModal/CurrentForm/ColumnModel/config.js；文案由 i18n 注入 */

export type ColumnModelTranslate = (key: string) => string;

const CM = 'applicationManage.currentForm.columnModel';

function cm(t: ColumnModelTranslate, path: string) {
  return t(`${CM}.${path}`);
}

function buildControlTypeOptions(t: ColumnModelTranslate) {
  return [
    { label: cm(t, 'controlType.input'), value: 'input' },
    { label: cm(t, 'controlType.textarea'), value: 'textarea' },
    { label: cm(t, 'controlType.inputNumber'), value: 'inputNumber' },
    { label: cm(t, 'controlType.variableNumber'), value: 'variableNumber' },
    { label: cm(t, 'controlType.date'), value: 'date' },
    { label: cm(t, 'controlType.select'), value: 'select' },
    { label: cm(t, 'controlType.uploadImg'), value: 'uploadImg' },
    { label: cm(t, 'controlType.uploadVideo'), value: 'uploadVideo' },
    { label: cm(t, 'controlType.uploadFile'), value: 'uploadFile' },
  ];
}

function buildWhetherOrNot(t: ColumnModelTranslate) {
  return [
    { label: t('applicationManage.currentForm.common.yes'), value: true },
    { label: t('applicationManage.currentForm.common.no'), value: false },
  ];
}

function buildDataSources(t: ColumnModelTranslate) {
  return [
    { label: cm(t, 'dataSource.manual'), value: 0 },
    { label: cm(t, 'dataSource.enum'), value: 1 },
    { label: cm(t, 'dataSource.api'), value: 2 },
  ];
}

function englishPropRule(t: ColumnModelTranslate) {
  return {
    pattern: /^[a-zA-Z0-9_]+$/,
    message: cm(t, 'rule.propEnglishOnly'),
  };
}

export function buildColumnModelBaseColumns(t: ColumnModelTranslate): Record<string, any>[] {
  const CONTROL_TYPE_OPTIONS = buildControlTypeOptions(t);
  const WHETHER_OR_NOT = buildWhetherOrNot(t);
  const ENGLISH_PROP_RULE = englishPropRule(t);

  return [
    {
      type: 'input',
      label: cm(t, 'field.controlName'),
      prop: 'label',
      maxLength: 10,
      rules: [{ required: true, message: cm(t, 'rule.enterControlName') }],
    },
    {
      type: 'input',
      label: cm(t, 'field.paramName'),
      prop: 'prop',
      rules: [{ required: true, message: cm(t, 'rule.enterParamName') }, ENGLISH_PROP_RULE],
      controlTip: cm(t, 'tip.alignBusinessParam'),
    },
    {
      type: 'select',
      label: cm(t, 'field.controlType'),
      prop: 'type',
      options: CONTROL_TYPE_OPTIONS,
      rules: [{ required: true, message: cm(t, 'rule.selectControlType') }],
    },
    {
      type: 'radio',
      label: cm(t, 'field.required'),
      prop: 'required',
      buttonStyle: true,
      options: WHETHER_OR_NOT,
      rules: [{ required: true, message: cm(t, 'rule.selectRequired') }],
      defaultValue: true,
    },
    {
      type: 'input',
      label: cm(t, 'field.controlTip'),
      prop: 'controlTip',
      maxLength: 30,
    },
    {
      type: 'radio',
      label: cm(t, 'field.show'),
      prop: 'show',
      buttonStyle: true,
      options: WHETHER_OR_NOT,
      defaultValue: true,
    },
    {
      type: 'switch',
      label: cm(t, 'field.multiModal'),
      prop: 'multiModal',
      defaultValue: false,
    },
    {
      type: 'radio',
      label: cm(t, 'field.multiModalShow'),
      prop: 'multiModalShow',
      buttonStyle: true,
      options: WHETHER_OR_NOT,
      defaultValue: true,
      show: false,
    },
  ];
}

export function buildControlTypeObj(
  encodingChildren: Record<string, any>[],
  t: ColumnModelTranslate,
): Record<string, Record<string, any>[]> {
  const encodingOptions = Array.isArray(encodingChildren) ? encodingChildren : [];
  const firstEncoding = encodingOptions[0]?.name ?? '';
  const WHETHER_OR_NOT = buildWhetherOrNot(t);
  const DATA_SOURCES = buildDataSources(t);

  return {
    input: [
      {
        type: 'select',
        label: cm(t, 'field.encoding'),
        prop: 'encoding',
        options: encodingOptions,
        defaultValue: firstEncoding,
        labelKey: 'content',
        valueKey: 'name',
      },
      {
        type: 'input',
        label: cm(t, 'field.placeholder'),
        prop: 'placeholder',
        maxLength: 30,
      },
      {
        type: 'input',
        label: cm(t, 'field.defaultValue'),
        prop: 'defaultValue',
        maxLength: 30,
      },
      {
        type: 'inputNumber',
        label: cm(t, 'field.maxLength'),
        prop: 'maxLength',
        defaultValue: 30,
        rules: [{ required: true, message: cm(t, 'rule.enterMaxLength') }],
      },
      {
        type: 'customInput',
        label: cm(t, 'field.regex'),
        prop: 'regex',
        maxLength: 500,
        slot: 'customInput',
      },
    ],
    textarea: [
      {
        type: 'select',
        label: cm(t, 'field.encoding'),
        prop: 'encoding',
        options: encodingOptions,
        defaultValue: firstEncoding,
        labelKey: 'content',
        valueKey: 'name',
      },
      {
        type: 'input',
        label: cm(t, 'field.placeholder'),
        prop: 'placeholder',
        maxLength: 30,
      },
      {
        type: 'input',
        label: cm(t, 'field.defaultValue'),
        prop: 'defaultValue',
        maxLength: 30,
      },
      {
        type: 'inputNumber',
        label: cm(t, 'field.maxLength'),
        prop: 'maxLength',
        defaultValue: 100,
        max: 20000,
        rules: [{ required: true, message: cm(t, 'rule.enterMaxLength') }],
      },
      {
        type: 'inputNumber',
        label: cm(t, 'field.minRows'),
        prop: 'minRows',
        defaultValue: 2,
        max: 20,
        min: 1,
        rules: [{ required: true, message: cm(t, 'rule.enterMin') }],
      },
      {
        type: 'inputNumber',
        label: cm(t, 'field.maxRows'),
        prop: 'maxRows',
        defaultValue: 6,
        min: 1,
        max: 20,
        rules: [{ required: true, message: cm(t, 'rule.enterMax') }],
      },
      {
        type: 'customInput',
        label: cm(t, 'field.textareaUpload'),
        prop: 'textareaUpload',
        buttonStyle: true,
        options: WHETHER_OR_NOT,
        slot: 'textareaUpload',
        defaultValue: false,
        rules: [{ required: true, message: cm(t, 'rule.selectImportContent') }],
      },
      {
        type: 'radio',
        label: cm(t, 'field.showCharCount'),
        prop: 'isNum',
        buttonStyle: true,
        options: WHETHER_OR_NOT,
        defaultValue: false,
      },
      {
        type: 'radio',
        label: cm(t, 'field.aigc'),
        prop: 'aigc',
        buttonStyle: true,
        options: WHETHER_OR_NOT,
        defaultValue: false,
      },
      {
        type: 'customInput',
        label: cm(t, 'field.regex'),
        prop: 'regex',
        maxLength: 500,
        slot: 'customInput',
      },
    ],
    inputNumber: [
      { type: 'input', label: cm(t, 'field.placeholder'), prop: 'placeholder' },
      { type: 'input', label: cm(t, 'field.defaultValue'), prop: 'defaultValue' },
      {
        type: 'inputNumber',
        label: cm(t, 'field.max'),
        prop: 'max',
        defaultValue: 999999,
        rules: [{ required: true, message: cm(t, 'rule.enterMax') }],
      },
      {
        type: 'inputNumber',
        label: cm(t, 'field.min'),
        prop: 'min',
        defaultValue: 0,
        rules: [{ required: true, message: cm(t, 'rule.enterMin') }],
      },
      {
        type: 'inputNumber',
        label: cm(t, 'field.precision'),
        prop: 'precision',
        defaultValue: 0,
        rules: [{ required: true, message: cm(t, 'rule.enterPrecision') }],
      },
      {
        type: 'inputNumber',
        label: cm(t, 'field.step'),
        prop: 'step',
        defaultValue: 1,
        rules: [{ required: true, message: cm(t, 'rule.enterStep') }],
      },
    ],
    variableNumber: [
      { type: 'input', label: cm(t, 'field.placeholder'), prop: 'placeholder' },
      { type: 'input', label: cm(t, 'field.defaultValue'), prop: 'defaultValue' },
      {
        type: 'inputNumber',
        label: cm(t, 'field.max'),
        prop: 'max',
        defaultValue: 999999,
        rules: [{ required: true, message: cm(t, 'rule.enterMax') }],
      },
      {
        type: 'inputNumber',
        label: cm(t, 'field.min'),
        prop: 'min',
        defaultValue: 0,
        rules: [{ required: true, message: cm(t, 'rule.enterMin') }],
      },
      {
        type: 'inputNumber',
        label: cm(t, 'field.precision'),
        prop: 'precision',
        defaultValue: 0,
        rules: [{ required: true, message: cm(t, 'rule.enterPrecision') }],
      },
      {
        type: 'inputNumber',
        label: cm(t, 'field.step'),
        prop: 'step',
        defaultValue: 1,
        rules: [{ required: true, message: cm(t, 'rule.enterStep') }],
      },
    ],
    date: [
      { type: 'input', label: cm(t, 'field.placeholder'), prop: 'placeholder' },
      { type: 'input', label: cm(t, 'field.defaultValue'), prop: 'defaultValue' },
      {
        type: 'radio',
        buttonStyle: true,
        label: cm(t, 'field.showTime'),
        prop: 'showTime',
        options: WHETHER_OR_NOT,
        defaultValue: true,
      },
      {
        type: 'input',
        label: cm(t, 'field.dateFormat'),
        prop: 'dateFormat',
        placeholder: cm(t, 'placeholder.dateFormatDefault'),
        defaultValue: 'YYYY-MM-DD HH:mm:ss',
      },
      {
        type: 'input',
        label: cm(t, 'field.valueFormat'),
        prop: 'valueFormat',
        placeholder: cm(t, 'placeholder.valueFormatDefault'),
        defaultValue: 'YYYY-MM-DD HH:mm:ss',
      },
    ],
    select: [
      { type: 'input', label: cm(t, 'field.defaultValue'), prop: 'defaultValue' },
      {
        type: 'customInput',
        label: cm(t, 'field.dataSources'),
        prop: 'dataSources',
        options: DATA_SOURCES,
        slot: 'dataSources',
        defaultValue: 0,
      },
    ],
    uploadImg: [
      {
        type: 'inputNumber',
        label: cm(t, 'field.maxSize'),
        prop: 'maxSize',
        unit: 'KB',
        defaultValue: 5120,
        max: 512000,
        min: 1,
        precision: 0,
        rules: [{ required: true, message: cm(t, 'rule.enterImageSize') }],
      },
      {
        type: 'input',
        label: cm(t, 'field.fileFormat'),
        prop: 'fileFormat',
        maxLength: 100,
        defaultValue: '.jpg,.jpeg,.png,.bmp',
        rules: [{ required: true, message: cm(t, 'rule.enterImageSuffix') }],
      },
      {
        type: 'inputNumber',
        label: cm(t, 'field.maxImages'),
        prop: 'maxLength',
        defaultValue: 1,
        max: 50,
        min: 1,
        rules: [{ required: true, message: cm(t, 'rule.enterMaxImages') }],
      },
      {
        type: 'radio',
        label: cm(t, 'field.multipleImg'),
        prop: 'multiple',
        buttonStyle: true,
        options: WHETHER_OR_NOT,
        defaultValue: false,
      },
      {
        type: 'radio',
        label: cm(t, 'field.aigc'),
        prop: 'aigc',
        buttonStyle: true,
        options: WHETHER_OR_NOT,
        defaultValue: false,
      },
      {
        type: 'input',
        label: cm(t, 'field.httpUrl'),
        maxLength: 200,
        prop: 'httpUrl',
        defaultValue: '/oss/upload',
      },
    ],
    uploadVideo: [
      {
        type: 'inputNumber',
        label: cm(t, 'field.maxSize'),
        prop: 'maxSize',
        unit: 'KB',
        defaultValue: 5120,
        max: 512000,
        min: 1,
        precision: 0,
        rules: [{ required: true, message: cm(t, 'rule.enterVideoSize') }],
      },
      {
        type: 'input',
        label: cm(t, 'field.fileFormat'),
        prop: 'fileFormat',
        maxLength: 100,
        defaultValue: '.mp4,.mov,.avi,.wmv,.flv,.webm,.mkv',
        rules: [{ required: true, message: cm(t, 'rule.enterVideoSuffix') }],
      },
      {
        type: 'inputNumber',
        label: cm(t, 'field.maxCount'),
        prop: 'maxLength',
        defaultValue: 1,
        max: 50,
        min: 1,
        rules: [{ required: true, message: cm(t, 'rule.enterMaxCount') }],
      },
      {
        type: 'radio',
        label: cm(t, 'field.multiple'),
        prop: 'multiple',
        buttonStyle: true,
        options: WHETHER_OR_NOT,
        defaultValue: false,
      },
      {
        type: 'radio',
        label: cm(t, 'field.aigc'),
        prop: 'aigc',
        buttonStyle: true,
        options: WHETHER_OR_NOT,
        defaultValue: false,
      },
      {
        type: 'input',
        label: cm(t, 'field.httpUrl'),
        maxLength: 200,
        prop: 'httpUrl',
        defaultValue: '/oss/upload',
      },
    ],
    uploadFile: [
      {
        type: 'inputNumber',
        label: cm(t, 'field.maxSize'),
        prop: 'maxSize',
        unit: 'KB',
        defaultValue: 5120,
        max: 512000,
        min: 1,
        precision: 0,
        rules: [{ required: true, message: cm(t, 'rule.enterFileSize') }],
      },
      {
        type: 'input',
        label: cm(t, 'field.fileFormat'),
        defaultValue: '.txt',
        prop: 'fileFormat',
        maxLength: 100,
        rules: [{ required: true, message: cm(t, 'rule.enterFileSuffix') }],
      },
      {
        type: 'inputNumber',
        label: cm(t, 'field.maxCount'),
        prop: 'maxLength',
        defaultValue: 1,
        max: 50,
        min: 1,
        rules: [{ required: true, message: cm(t, 'rule.enterMaxCount') }],
      },
      {
        type: 'radio',
        label: cm(t, 'field.multiple'),
        prop: 'multiple',
        buttonStyle: true,
        options: WHETHER_OR_NOT,
        defaultValue: false,
      },
      {
        type: 'radio',
        label: cm(t, 'field.aigc'),
        prop: 'aigc',
        buttonStyle: true,
        options: WHETHER_OR_NOT,
        defaultValue: false,
      },
      {
        type: 'input',
        label: cm(t, 'field.httpUrl'),
        maxLength: 200,
        prop: 'httpUrl',
        defaultValue: '/oss/upload',
      },
    ],
  };
}
