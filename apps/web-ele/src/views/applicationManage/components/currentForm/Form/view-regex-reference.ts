/** 与 social_media_web ViewRegex/config.js 一致的业务常用正则说明（展示文案走 i18n） */
export const VIEW_REGEX_REFERENCE_ROWS: { labelKey: string; value: string }[] = [
  { labelKey: 'applicationManage.currentForm.viewRegex.number', value: '^[0-9]*$' },
  { labelKey: 'applicationManage.currentForm.viewRegex.nDigits', value: '^d{n}$' },
  { labelKey: 'applicationManage.currentForm.viewRegex.threeChars', value: '^.{3}$' },
  { labelKey: 'applicationManage.currentForm.viewRegex.atLeastNDigits', value: '^d{n,}$' },
  { labelKey: 'applicationManage.currentForm.viewRegex.mToNDigits', value: '^d{m,n}$' },
  { labelKey: 'applicationManage.currentForm.viewRegex.zeroOrNonZeroStart', value: '^(0|[1-9][0-9]*)$' },
  {
    labelKey: 'applicationManage.currentForm.viewRegex.nonZeroWithTwoDecimals',
    value: '^([1-9][0-9]*)+(.[0-9]{1,2})?$',
  },
  { labelKey: 'applicationManage.currentForm.viewRegex.posNegWithDecimals', value: '^(-)?d+(.d{1,2})?$' },
  {
    labelKey: 'applicationManage.currentForm.viewRegex.standardTime',
    value:
      '^d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]d|(30|31)(?![0469]|11)) ([01]d|2[0-3]):[0-5]d:[0-5]d$',
  },
  { labelKey: 'applicationManage.currentForm.viewRegex.posNegDecimal', value: '^(-|+)?d+(.d+)?$' },
  { labelKey: 'applicationManage.currentForm.viewRegex.posRealWithTwoDecimals', value: '^[0-9]+(.[0-9]{2})?$' },
  { labelKey: 'applicationManage.currentForm.viewRegex.posRealWith1To3Decimals', value: '^[0-9]+(.[0-9]{1,3})?$' },
  {
    labelKey: 'applicationManage.currentForm.viewRegex.nonZeroPosInt',
    value: '^[1-9]d*$ 或 ^([1-9][0-9]*){1,3}$ 或 ^+?[1-9][0-9]*$',
  },
  { labelKey: 'applicationManage.currentForm.viewRegex.nonZeroNegInt', value: '^-[1-9][]0-9"*$ 或 ^-[1-9]d*$' },
  { labelKey: 'applicationManage.currentForm.viewRegex.nonNegInt', value: '^d+$ 或 ^[1-9]d*|0$' },
  { labelKey: 'applicationManage.currentForm.viewRegex.nonPosInt', value: '^-[1-9]d*|0$ 或 ^((-d+)|(0+))$' },
  {
    labelKey: 'applicationManage.currentForm.viewRegex.nonNegFloat',
    value: '^d+(.d+)?$ 或 ^[1-9]d*.d*|0.d*[1-9]d*|0?.0+|0$',
  },
  {
    labelKey: 'applicationManage.currentForm.viewRegex.nonPosFloat',
    value: '^((-d+(.d+)?)|(0+(.0+)?))$ 或 ^(-([1-9]d*.d*|0.d*[1-9]d*))|0?.0+|0$',
  },
  {
    labelKey: 'applicationManage.currentForm.viewRegex.posFloat',
    value:
      '^[1-9]d*.d*|0.d*[1-9]d*$ 或 ^(([0-9]+.[0-9]*[1-9][0-9]*)|([0-9]*[1-9][0-9]*.[0-9]+)|([0-9]*[1-9][0-9]*))$',
  },
  {
    labelKey: 'applicationManage.currentForm.viewRegex.negFloat',
    value:
      '^-([1-9]d*.d*|0.d*[1-9]d*)$ 或 ^(-(([0-9]+.[0-9]*[1-9][0-9]*)|([0-9]*[1-9][0-9]*.[0-9]+)|([0-9]*[1-9][0-9]*)))$',
  },
  {
    labelKey: 'applicationManage.currentForm.viewRegex.float',
    value: '^(-?d+)(.d+)?$ 或 ^-?([1-9]d*.d*|0.d*[1-9]d*|0?.0+|0)$',
  },
  { labelKey: 'applicationManage.currentForm.viewRegex.pureEnglish', value: '^[A-Za-z]+$' },
  { labelKey: 'applicationManage.currentForm.viewRegex.upperCase', value: '^[A-Z]+$' },
  { labelKey: 'applicationManage.currentForm.viewRegex.lowerCase', value: '^[a-z]+$' },
  { labelKey: 'applicationManage.currentForm.viewRegex.numberEnglish', value: '^[A-Za-z0-9]+$' },
  { labelKey: 'applicationManage.currentForm.viewRegex.alphanumericUnderscore', value: '^w+$' },
  { labelKey: 'applicationManage.currentForm.viewRegex.specialChars', value: '[^%&\',;=?$\x22]+' },
  { labelKey: 'applicationManage.currentForm.viewRegex.chinese', value: '^[\u4e00-\u9fa5]{0,}$	' },
  { labelKey: 'applicationManage.currentForm.viewRegex.email', value: '^w+([-+.]w+)*@w+([-.]w+)*.w+([-.]w+)*$' },
  { labelKey: 'applicationManage.currentForm.viewRegex.internetUrl', value: '^http://([w-]+.)+[w-]+(/[w-./?%&=]*)?$' },
  { labelKey: 'applicationManage.currentForm.viewRegex.idCard', value: '^d{15}|d{18}$' },
  {
    labelKey: 'applicationManage.currentForm.viewRegex.ip',
    value: '^((2[0-4]d|25[0-5]|[01]?dd?).){3}(2[0-4]d|25[0-5]|[01]?dd?)$',
  },
];
