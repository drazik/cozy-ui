import React, { Component } from 'react'
import ReactDOM from 'react-dom'
import PropTypes from 'prop-types'
import cx from 'classnames'
import Hammer from 'hammerjs'
import styles from './styles.styl'
import Overlay from '../Overlay'
import once from 'lodash/once'

const TRANSITION_DURATION = 100 // need to be kept in sync with css

/**
 * Use an ActionMenu to show the user possible actions to the user
 * at the bottom of the screen in a modal way.
 *
 * - Animates in/out
 * - Possible to use Escape to close (thanks to `<Overlay />`)
 * - Possible to click outside to close (thanks to `<Overlay />`)
 * - Reacts to gestures with HammerJS
 */
class ActionMenu extends Component {
  componentDidMount() {
    this.initialAppear()
    this.attachEvents()
  }

  componentWillUnmount() {
    this.gesturesHandler.destroy()
  }

  initialAppear() {
    this.turnTransitionsOff()
    this.applyTransformation(1)
    requestAnimationFrame(() => {
      this.turnTransitionsOn()
      this.applyTransformation(0)
    })
  }

  turnTransitionsOn() {
    this.menuNode.classList.add(styles['with-transition'])
  }

  turnTransitionsOff() {
    this.menuNode.classList.remove(styles['with-transition'])
  }

  attachEvents() {
    this.gesturesHandler = new Hammer.Manager(this.wrapperNode, {
      recognizers: [[Hammer.Pan, { direction: Hammer.DIRECTION_VERTICAL }]]
    })

    // to be completely accurate, `maximumGestureDelta` should be the difference between the top of the menu and the
    // bottom of the page; but using the height is much easier to compute and accurate enough.
    const maximumGestureDistance = this.menuNode.getBoundingClientRect().height
    // between 0 and 1, how far down the gesture must be to be considered complete upon release
    const minimumCloseDistance = 0.6
    // a gesture faster than this will dismiss the menu, regardless of distance traveled
    const minimumCloseVelocity = 0.6

    let currentGestureProgress = null

    this.gesturesHandler.on('panstart', () => {
      this.turnTransitionsOff()
      currentGestureProgress = 0
    })

    this.gesturesHandler.on('pan', e => {
      currentGestureProgress = e.deltaY / maximumGestureDistance
      this.applyTransformation(currentGestureProgress)
    })

    this.gesturesHandler.on('panend', e => {
      // Dismiss the menu if the swipe pan was bigger than the treshold,
      // or if it was a fast, downward gesture
      let shouldDismiss =
        e.deltaY / maximumGestureDistance >= minimumCloseDistance ||
        (e.deltaY > 0 && e.velocity >= minimumCloseVelocity)

      if (shouldDismiss) {
        if (currentGestureProgress >= 1) {
          // Menu is already hidden, close it right away
          this.close()
        } else {
          this.turnTransitionsOn()
          this.animateClose()
        }
      } else {
        this.turnTransitionsOn()
        this.applyTransformation(0)
      }
    })
  }

  /**
   * Applies a css trasnform to the element, based on the progress of the gesture
   * @param  {Float} progress - Amount of progress between 0 and 1
   */
  applyTransformation(progress) {
    // constrain between 0 and 1.1 (go a bit further than 1 to be hidden completely)
    progress = Math.min(1.1, Math.max(0, progress))
    this.menuNode.style.transform = 'translateY(' + progress * 100 + '%)'
  }

  animateClose = () => {
    this.setState({ closing: true })

    // we need to transition the menu to the bottom before dismissing it
    const close = once(() => {
      this.menuNode.removeEventListener('transitionend', close)
      this.close()
    })

    this.menuNode.addEventListener('transitionend', close, false)
    // in case transitionend is not called, for example if the element is removed
    setTimeout(close, TRANSITION_DURATION)

    this.applyTransformation(1.1)
  }

  close = () => {
    this.setState({ closing: true })
    this.props.onClose()
  }

  handleMenuRef = menu => {
    // FIXME
    this.menuNode = ReactDOM.findDOMNode(menu) // eslint-disable-line react/no-find-dom-node
  }

  handleWrapperRef = wrapper => {
    // FIXME
    this.wrapperNode = ReactDOM.findDOMNode(wrapper) // eslint-disable-line react/no-find-dom-node
  }

  render() {
    const { children, className } = this.props
    const { closing } = this.state
    return (
      <div
        className={cx(styles.ActionMenu, className)}
        ref={this.handleWrapperRef}
      >
        <Overlay
          style={{ opacity: closing ? 0 : 1 }}
          onClick={this.animateClose}
          onEscape={this.animateClose}
        >
          <div className={styles['c-actionmenu']} ref={this.handleMenuRef}>
            {children}
          </div>
        </Overlay>
      </div>
    )
  }
}

ActionMenu.propTypes = {
  /** Extra class */
  className: PropTypes.string,
  /** What to do on close */
  onClose: PropTypes.func
}

export default ActionMenu
