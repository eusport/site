module.exports = {
    content: ['./layouts/**/*.html', './layouts/partials/**/*.html', './content/**/*.md', './content/**/*.html'],
    plugins: [
        require('@tailwindcss/typography'),
        require('@tailwindcss/line-clamp'),
        require("tailwindcss-intersect"),
    ],
    theme: {
        extend: {
            colors: {
                primary: '#FFA500',
                secondary: '#003399',
            },
        },
        transitionDuration: {
            '800': '800ms',
            '1200': '1200ms',
            '1500': '1500ms',
            '2000': '2000ms',
        },
        screens: {
            xs: { max: '575px' }, // Mobile (iPhone 3 - iPhone XS Max).
            sm: { min: '576px', max: '897px' }, // Mobile (matches max: iPhone 11 Pro Max landscape @ 896px).
            md: { min: '898px', max: '1023px' }, // Tablet (matches max: iPad Pro @ 1112px).
            lg: { min: '1024px' }, // Desktop smallest.
            xl: { min: '1159px' }, // Desktop wide.
            xxl: { min: '1359px' } // Desktop widescreen.
        },
    },
    // daisyUI config (optional)
    daisyui: {
        styled: true,
        themes: ["light"],
        base: true,
        utils: true,
        logs: true,
        rtl: false,
        prefix: "",
    },
}
