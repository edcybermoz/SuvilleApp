// src/components/NavLink.tsx
import { forwardRef } from "react";
import {
  NavLink as RouterNavLink,
  NavLinkProps,
  NavLinkRenderProps,
} from "react-router-dom";
import { cn } from "@/lib/utils";

type ClassNameValue =
  | string
  | ((props: NavLinkRenderProps) => string | undefined);

interface NavLinkCompatProps extends Omit<NavLinkProps, "className"> {
  className?: ClassNameValue;
  activeClassName?: string;
  pendingClassName?: string;
  inactiveClassName?: string;
}

const NavLink = forwardRef<HTMLAnchorElement, NavLinkCompatProps>(
  (
    {
      className,
      activeClassName,
      pendingClassName,
      inactiveClassName,
      to,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <RouterNavLink
        ref={ref}
        to={to}
        className={(state) =>
          cn(
            typeof className === "function" ? className(state) : className,
            state.isActive && activeClassName,
            state.isPending && pendingClassName,
            !state.isActive && !state.isPending && inactiveClassName
          )
        }
        {...props}
      >
        {typeof children === "function" ? children : children}
      </RouterNavLink>
    );
  }
);

NavLink.displayName = "NavLink";

export { NavLink };