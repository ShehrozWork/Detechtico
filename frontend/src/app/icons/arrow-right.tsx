import * as React from "react";
const ArrowRight = ({ fill = "currentColor", ...props }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={25}
    height={17}
    fill="none"
    viewBox="0 0 25 17"
    {...props}
  >
    <g
      stroke="currentColor"
      strokeMiterlimit={10}
      clipPath="url(#MediumArrow_svg__a)"
    >
      <path d="M16 16.534 24.506 8.5 16 .467M24.504 8.502H0" />
    </g>
    <defs>
      <clipPath id="MediumArrow_svg__a">
        <path
          fill={fill}
          opacity={1}
          data-original="#000000"
          d="M0 .22h25v16.56H0z"
        />
      </clipPath>
    </defs>
  </svg>
);
export default ArrowRight;
