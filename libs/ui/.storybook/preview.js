import { withThemeByClassName } from '@storybook/addon-themes';

const preview = {
  decorators: [
    withThemeByClassName({
      defaultTheme: 'Light',
      parentSelector: 'body',
      themes: {
        Dark: 'theme-dark',
        Light: 'theme-light'
      }
    })
  ]
};

if (typeof document !== 'undefined') {
  document.body.classList.add('mat-typography');
}

export default preview;
