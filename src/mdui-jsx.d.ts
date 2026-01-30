import 'react';

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'mdui-top-app-bar': any;
      'mdui-top-app-bar-title': any;
      'mdui-button': any;
      'mdui-icon': any;
      'mdui-card': any;
      'mdui-linear-progress': any;
      'mdui-list': any;
      'mdui-list-item': any;
      'mdui-collapse': any;
      'mdui-collapse-item': any;
      'mdui-dialog': any;
      'mdui-divider': any;
    }
  }
}
