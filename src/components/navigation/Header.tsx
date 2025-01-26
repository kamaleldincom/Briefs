// src/components/navigation/Header.tsx
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronLeft, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface HeaderProps {
  isStoryPage?: boolean;
}

export default function Header({ isStoryPage = false }: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        {/* Left section with back button for story pages */}
        <div className="flex items-center gap-2">
          {isStoryPage && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
              className="mr-2"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
          )}
          <Link href="/" className="flex items-center space-x-2">
            {/* You can replace this with your actual logo */}
            <span className="font-geist-sans font-bold text-xl">News App</span>
          </Link>
        </div>

        {/* Center section - Feed Types (hidden on mobile) */}
        <nav className="mx-6 flex items-center space-x-4 lg:space-x-6 hidden md:flex">
          <Button
            variant="ghost"
            className={pathname === "/" ? "text-foreground" : "text-muted-foreground"}
            asChild
          >
            <Link href="/">International</Link>
          </Button>
          <Button
            variant="ghost"
            className="text-muted-foreground"
            disabled
          >
            Local
          </Button>
          <Button
            variant="ghost"
            className="text-muted-foreground"
            disabled
          >
            For You
          </Button>
        </nav>

        {/* Mobile menu (shown on mobile) */}
        <div className="flex md:hidden ml-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href="/">International</Link>
              </DropdownMenuItem>
              <DropdownMenuItem disabled>
                Local
              </DropdownMenuItem>
              <DropdownMenuItem disabled>
                For You
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Right section - Profile (to be implemented) */}
        <div className="ml-auto hidden md:flex">
          <Button variant="ghost" disabled>
            Sign In
          </Button>
        </div>
      </div>
    </header>
  );
}
