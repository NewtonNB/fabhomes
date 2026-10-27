// Number to words converter for Fab Homes Uganda financial documents

export const numberToWords = (num: number): string => {
  if (num === 0) return 'Zero'
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']
  const scales = ['', 'Thousand', 'Million', 'Billion', 'Trillion']

  const convertGroup = (n: number): string => {
    let s = ''
    if (n >= 100) {
      s += ones[Math.floor(n / 100)] + ' Hundred '
      n %= 100
    }
    if (n >= 20) {
      s += tens[Math.floor(n / 10)] + (n % 10 !== 0 ? '-' + ones[n % 10] : '') + ' '
    } else if (n > 0) {
      s += ones[n] + ' '
    }
    return s.trim()
  }

  let s = ''
  let scaleIdx = 0
  let whole = Math.floor(Math.abs(num))
  while (whole > 0) {
    const chunk = whole % 1000
    if (chunk > 0) {
      const groupStr = convertGroup(chunk)
      s = groupStr + (scales[scaleIdx] ? ' ' + scales[scaleIdx] : '') + ' ' + s
    }
    whole = Math.floor(whole / 1000)
    scaleIdx++
  }
  return s.trim()
}

export const formatAmountInWords = (amount: number, currency = 'UGX'): string => {
  const words = numberToWords(amount)
  const currLabel = currency.toUpperCase() === 'UGX' ? 'Uganda Shillings' : currency.toUpperCase()
  return `${words} ${currLabel} Only`
}
