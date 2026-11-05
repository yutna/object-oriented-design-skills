package clinic

data class VisitLength(val minutes: Int) {
    companion object {
        fun of(minutes: Int): VisitLength {
            require(minutes in 5..120) { "a visit lasts from 5 to 120 minutes" }
            return VisitLength(minutes)
        }
    }
}
