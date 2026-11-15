import js from '@eslint/js'
import globals from 'globals'
import eslintReact from '@eslint-react/eslint-plugin'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

// Design-input keys are written once, in osdag_core/Common.py. Import the constant from
// coreKeys.js (or webKeys.js for the few keys the core does not have) instead of the string.
const DOTTED_KEY = String.raw`/^[A-Z][A-Za-z0-9_]*( [A-Z][A-Za-z0-9_]*)?(\.[A-Za-z0-9_]+)+$/`
const UNDOTTED_KEY = String.raw`/^(Module|Material|Connectivity|Conn_Location|End_1|End_2|End_1_Y|End_2_Y|EndPlateType|PlateWidth|Plate1Thickness|Plate2Thickness)$/`
const KEY_MESSAGE =
  'Import design-input keys from src/constants/generated/coreKeys.js (or webKeys.js) instead of writing the string.'

// Files that still hold inline keys. Remove a file from this list when it is converted.
const KEYS_NOT_CONVERTED = [
  'src/modules/basePlate/configs/basePlateConfig.js',
  'src/modules/beamBeamEndPlate/configs/beamBeamEndPlateConfig.js',
  'src/modules/beamToColumnEndPlate/configs/beamToColumnEndPlateConfig.js',
  'src/modules/columnColumnEndPlate/configs/columnColumnEndPlateConfig.js',
  'src/modules/compressionMember/configs/axiallyLoadedColumnConfig.js',
  'src/modules/compressionMember/configs/strutsBoltedConfig.js',
  'src/modules/compressionMember/configs/strutsWeldedConfig.js',
  'src/modules/flexuralMember/onCantilever/configs/onCantileverConfig.js',
  'src/modules/flexuralMember/plateGirder/configs/plateGirderConfig.js',
  'src/modules/flexuralMember/simplySupportedBeam/configs/simplySupportedBeamConfig.js',
  'src/modules/registry.js',
  'src/modules/shared/components/AnchorBoltSectionModal.jsx',
  'src/modules/shared/components/BasePlateSectionModal.jsx',
  'src/modules/shared/components/DesignPrefSections.jsx',
  'src/modules/shared/components/DesignReportModal.jsx',
  'src/modules/shared/components/StiffenerSectionModal.jsx',
  'src/modules/shared/config/coverPlateConfigFactory.js',
  'src/modules/shared/config/designPrefModuleConfig.js',
  'src/modules/shared/utils/osiMapperTracer.js',
  'src/modules/shared/utils/osiNormalizer.js',
  'src/modules/shearConnection/cleatAngle/configs/cleatAngleConfig.js',
  'src/modules/shearConnection/endPlate/configs/endPlateConfig.js',
  'src/modules/shearConnection/finPlate/configs/finPlateConfig.js',
  'src/modules/shearConnection/seatAngle/configs/seatedAngleConfig.js',
]

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      eslintReact.configs.recommended,
      reactRefresh.configs.vite,
    ],
    plugins: {
      'react-hooks': reactHooks,
    },
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      // Classic hook rules only; the React Compiler rules in
      // react-hooks' recommended preset don't apply (no compiler in use)
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      '@eslint-react/rules-of-hooks': 'off',
      '@eslint-react/exhaustive-deps': 'off',
      '@eslint-react/set-state-in-effect': 'off',
      '@eslint-react/static-components': 'off',
      '@eslint-react/purity': 'off',
      // Style preferences not enforced in this codebase
      '@eslint-react/no-array-index-key': 'off',
      '@eslint-react/dom-no-dangerously-set-innerhtml': 'off',
      '@eslint-react/no-use-context': 'off',
      '@eslint-react/no-context-provider': 'off',
      '@eslint-react/no-forward-ref': 'off',
      '@eslint-react/naming-convention-ref-name': 'off',
      '@eslint-react/use-state': 'off',
      '@eslint-react/no-unnecessary-use-prefix': 'off',
    },
  },
  {
    files: ['src/**/*.{js,jsx}'],
    ignores: [
      'src/constants/generated/**',
      'src/test/**',
      'src/**/*.test.js',
      'src/modules/flexuralMember/purlin/**',
      ...KEYS_NOT_CONVERTED,
    ],
    rules: {
      'no-restricted-syntax': [
        'error',
        { selector: `Literal[value=${DOTTED_KEY}]`, message: KEY_MESSAGE },
        {
          selector: `TemplateLiteral[expressions.length=0] > TemplateElement[value.raw=${DOTTED_KEY}]`,
          message: KEY_MESSAGE,
        },
        { selector: `Property[computed=false][shorthand=false] > Identifier.key[name=${UNDOTTED_KEY}]`, message: KEY_MESSAGE },
        { selector: `Property[computed=false] > Literal.key[value=${UNDOTTED_KEY}]`, message: KEY_MESSAGE },
        { selector: `MemberExpression[computed=true] > Literal.property[value=${UNDOTTED_KEY}]`, message: KEY_MESSAGE },
      ],
    },
  },
])
