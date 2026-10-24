package com.mdl.tclremote

import com.mdl.tclremote.ui.AppIcons
import org.junit.Assert.assertEquals
import org.junit.Test

class AppIconsTest {
    @Test
    fun prefersIconImageAndRequestsSquareSize() {
        val html = """
            <meta property="og:image" content="https://play-lh.googleusercontent.com/banner=w526-h296">
            <img src="https://play-lh.googleusercontent.com/shot=w526-h296" alt="Screenshot image">
            <img src="https://play-lh.googleusercontent.com/icon123=w240-h480-rw" class="T75of" alt="Icon image" itemprop="image">
        """
        assertEquals("https://play-lh.googleusercontent.com/icon123=s192", AppIcons.iconUrl(html))
    }

    @Test
    fun fallsBackToOgImage() {
        val html = """<meta property="og:image" content="https://play-lh.googleusercontent.com/og=w526">"""
        assertEquals("https://play-lh.googleusercontent.com/og=s192", AppIcons.iconUrl(html))
    }
}
