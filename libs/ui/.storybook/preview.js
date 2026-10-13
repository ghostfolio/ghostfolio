import '@angular/localize/init';
import {
  withThemeByClassName,
  withThemeByDataAttribute
} from '@storybook/addon-themes';

const preview = {
  decorators: [
    withThemeByClassName({
      defaultTheme: 'Light',
      parentSelector: 'body',
      themes: {
        Dark: 'theme-dark',
        Light: 'theme-light'
      }
    }),
    withThemeByDataAttribute({
      attributeName: 'data-bs-theme',
      defaultTheme: 'Light',
      parentSelector: 'html',
      themes: {
        Dark: 'dark',
        Light: 'light'
      }
    })
  ]
};

if (typeof document !== 'undefined') {
  document.body.classList.add('mat-typography');
}

export default preview;
